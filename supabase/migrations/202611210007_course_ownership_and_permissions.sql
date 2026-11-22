-- Course ownership: predefined courses are public, teacher courses are shared with
-- connected students, and student-created courses remain private to their owner.
alter table public.courses add column if not exists course_kind text;
alter table public.courses add column if not exists deleted_at timestamptz;
alter table public.courses add column if not exists published_at timestamptz;

update public.courses c
set course_kind = case
  when c.owner_id is null then 'predefined'
  when p.role = 'teacher' then 'teacher'
  else 'student'
end
from public.profiles p
where c.owner_id = p.id and c.course_kind is null;

update public.courses set course_kind = 'predefined' where owner_id is null and course_kind is null;
update public.courses set published_at = created_at where status = 'published' and published_at is null;

alter table public.courses alter column course_kind set default 'predefined';
alter table public.courses alter column course_kind set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'courses_course_kind_check') then
    alter table public.courses add constraint courses_course_kind_check
      check (course_kind in ('predefined', 'teacher', 'student'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courses_kind_owner_check') then
    alter table public.courses add constraint courses_kind_owner_check check (
      (course_kind = 'predefined' and owner_id is null) or
      (course_kind in ('teacher', 'student') and owner_id is not null)
    );
  end if;
end $$;

create index if not exists courses_owner_idx on public.courses(owner_id, created_at desc);
create index if not exists courses_visible_idx on public.courses(course_kind, status) where deleted_at is null;

-- Ownership and kind are fixed for the lifetime of a course. A teacher cannot
-- publish a student's work, and no course can be moved to another owner.
create or replace function public.guard_course_ownership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.owner_id is distinct from old.owner_id or new.course_kind is distinct from old.course_kind) then
    raise exception 'Course ownership cannot be changed';
  end if;
  if new.course_kind = 'predefined' then
    if new.owner_id is not null then raise exception 'Predefined courses cannot have an owner'; end if;
  elsif new.owner_id is null then
    raise exception 'A teacher or student course requires an owner';
  elsif not exists (
    select 1 from profiles where id = new.owner_id and role = new.course_kind
  ) then
    raise exception 'Course kind does not match the owner role';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_course_ownership on public.courses;
create trigger enforce_course_ownership before insert or update on public.courses
for each row execute function public.guard_course_ownership();

-- A student may see a teacher's published course only while their connection is
-- approved. Under-18 students additionally require recorded guardian approval.
create or replace function public.student_can_access_teacher_course(teacher uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from monitoring_requests r
    join profiles p on p.id = auth.uid()
    where r.teacher_id = teacher and r.student_id = auth.uid()
      and r.status = 'approved' and r.student_approved_at is not null
      and (p.age_band = 'adult' or (p.age_band = 'under18' and r.guardian_approved_at is not null))
  );
$$;

create or replace function public.can_read_course(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from courses c
    where c.id = target and c.deleted_at is null and (
      (c.course_kind = 'predefined' and c.status = 'published')
      or c.owner_id = auth.uid()
      or (c.course_kind = 'teacher' and c.status = 'published' and student_can_access_teacher_course(c.owner_id))
    )
  );
$$;

revoke all on function public.student_can_access_teacher_course(uuid) from public;
grant execute on function public.student_can_access_teacher_course(uuid) to authenticated, service_role;
revoke all on function public.can_read_course(uuid) from public;
grant execute on function public.can_read_course(uuid) to authenticated, service_role;

-- Enrollment repeats the access rules inside PostgreSQL so a crafted request
-- cannot enroll in a private or disconnected course.
create or replace function public.enroll_course(p_student uuid, p_course uuid, p_mode text)
returns uuid language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if not exists (select 1 from profiles where id = p_student and role = 'student') then raise exception 'Student required'; end if;
  if not exists (
    select 1 from courses c
    where c.id = p_course and c.deleted_at is null and (
      (c.course_kind = 'predefined' and c.status = 'published')
      or (c.course_kind = 'student' and c.owner_id = p_student and c.status in ('approved', 'published'))
      or (c.course_kind = 'teacher' and c.status = 'published' and exists (
        select 1 from monitoring_requests r join profiles p on p.id = p_student
        where r.teacher_id = c.owner_id and r.student_id = p_student
          and r.status = 'approved' and r.student_approved_at is not null
          and (p.age_band = 'adult' or (p.age_band = 'under18' and r.guardian_approved_at is not null))
      ))
    )
  ) then raise exception 'Course not available'; end if;
  insert into enrollments(student_id, course_id, mode) values (p_student, p_course, p_mode)
    on conflict (student_id, course_id) do nothing returning id into eid;
  if eid is null then select id into eid from enrollments where student_id = p_student and course_id = p_course; end if;
  insert into learning_sessions(enrollment_id) values (eid) on conflict do nothing;
  insert into diagnostics(enrollment_id) values (eid) on conflict do nothing;
  return eid;
end;
$$;

-- Creates an AI-generated draft for either role. The owner and kind are fixed at
-- creation, and the server cannot turn a student draft into a teacher course.
create or replace function public.create_course_draft(
  p_owner uuid, p_kind text, p_syllabus jsonb, p_path text
) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; topic jsonb; dep text; i int := 0;
begin
  if p_kind not in ('teacher', 'student') then raise exception 'Invalid course kind'; end if;
  if not exists (select 1 from profiles where id = p_owner and role = p_kind) then
    raise exception 'Course owner role does not match';
  end if;
  insert into courses(owner_id,title,subject,grade,description,status,source_path,course_kind)
    values (p_owner,p_syllabus->>'title',p_syllabus->>'subject',p_syllabus->>'grade',
      p_syllabus->>'description','draft',p_path,p_kind) returning id into cid;
  for topic in select * from jsonb_array_elements(p_syllabus->'concepts') loop
    insert into concepts(course_id,slug,title,summary,order_index,content)
      values (cid,topic->>'slug',topic->>'title',topic->>'summary',i,topic->'content');
    i := i + 1;
  end loop;
  for topic in select * from jsonb_array_elements(p_syllabus->'concepts') loop
    for dep in select jsonb_array_elements_text(topic->'prerequisites') loop
      insert into prerequisites(course_id,concept_id,prerequisite_id)
        select cid,c.id,p.id from concepts c, concepts p
        where c.course_id = cid and p.course_id = cid and c.slug = topic->>'slug' and p.slug = dep;
    end loop;
  end loop;
  return cid;
end;
$$;

create or replace function public.create_custom_course(p_owner uuid, p_syllabus jsonb, p_path text)
returns uuid language sql security definer set search_path = public as $$
  select public.create_course_draft(p_owner, 'student', p_syllabus, p_path);
$$;

create or replace function public.publish_course(p_course uuid, p_actor uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare c courses;
begin
  select * into c from courses where id = p_course and deleted_at is null for update;
  if not found then raise exception 'Course not found'; end if;
  if c.course_kind <> 'teacher' or c.owner_id <> p_actor then raise exception 'Only your teacher course can be published'; end if;
  if not exists (select 1 from profiles where id = p_actor and role = 'teacher') then raise exception 'Teacher required'; end if;
  if not exists (select 1 from concepts where course_id = p_course) then raise exception 'Add course content before publishing'; end if;
  update courses set status = 'published', published_at = coalesce(published_at, now()) where id = p_course;
  return p_course;
end;
$$;

-- Soft deletion hides the course and its content but preserves enrollments,
-- attempts, mastery and revision records for audit and future recovery.
create or replace function public.delete_course(p_course uuid, p_actor uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare c courses; actor_role text;
begin
  select role into actor_role from profiles where id = p_actor;
  select * into c from courses where id = p_course for update;
  if not found then raise exception 'Course not found'; end if;
  if c.owner_id is distinct from p_actor then raise exception 'You can only delete your own courses'; end if;
  if c.course_kind not in ('teacher', 'student') or actor_role is distinct from c.course_kind then
    raise exception 'Only custom courses can be deleted';
  end if;
  update courses set deleted_at = coalesce(deleted_at, now()) where id = p_course;
  return true;
end;
$$;

revoke execute on function public.create_course_draft(uuid,text,jsonb,text),
  public.create_custom_course(uuid,jsonb,text), public.publish_course(uuid,uuid),
  public.delete_course(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_course_draft(uuid,text,jsonb,text),
  public.create_custom_course(uuid,jsonb,text), public.publish_course(uuid,uuid),
  public.delete_course(uuid,uuid) to service_role;

-- Browser clients still have no course write privileges. All mutations pass the
-- authenticated server, while these policies protect every direct read.
drop policy if exists readable_courses on public.courses;
create policy readable_courses on public.courses for select to authenticated using (can_read_course(id));
