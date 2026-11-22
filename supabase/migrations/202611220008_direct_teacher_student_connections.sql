-- A connection needs the sender's request and the recipient's acceptance.
-- Guardian email is no longer part of registration or connection approval.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%guardian_email%'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end loop;
end;
$$;

create or replace function public.guard_monitoring() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = new.teacher_id and role = 'teacher')
     or not exists (select 1 from profiles where id = new.student_id and role = 'student') then
    raise exception 'Invalid monitoring roles';
  end if;
  if new.status in ('pending_teacher', 'approved') and new.student_approved_at is null then
    raise exception 'Student approval is required';
  end if;
  return new;
end;
$$;

-- Before migration 005, student requests used pending_student with their
-- approval timestamp set. Restore the correct recipient without accepting them.
update public.monitoring_requests
set status = 'pending_teacher', initiated_by = 'student'
where status = 'pending_student' and student_approved_at is not null;

-- These requests already have both the sender's and recipient's agreement.
-- Preserve that agreement without inventing a guardian approval timestamp.
update public.monitoring_requests
set status = 'approved'
where status = 'pending_guardian' and student_approved_at is not null;

-- Incomplete legacy rows still need an explicit student decision.
update public.monitoring_requests
set status = 'pending_student', initiated_by = 'teacher'
where status = 'pending_guardian';

alter table public.monitoring_requests drop constraint if exists monitoring_requests_status_check;
alter table public.monitoring_requests add constraint monitoring_requests_status_check
  check (status in ('pending_teacher', 'pending_student', 'approved', 'rejected', 'revoked'));

-- Old email links cannot affect a new or reopened connection.
update public.guardian_consents set consumed_at = now() where consumed_at is null;
create or replace function public.consume_guardian_consent(p_hash text) returns boolean
language sql security definer set search_path = public as $$ select false; $$;

create or replace function public.can_monitor(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from monitoring_requests r
    where r.teacher_id = auth.uid() and r.student_id = target
      and r.status = 'approved' and r.student_approved_at is not null
  );
$$;

create or replace function public.student_can_access_teacher_course(teacher uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from monitoring_requests r
    where r.teacher_id = teacher and r.student_id = auth.uid()
      and r.status = 'approved' and r.student_approved_at is not null
  );
$$;

-- Direct database reads follow the same course boundaries as the teacher UI:
-- predefined courses and the teacher's own courses, not private student work
-- or courses belonging to another teacher.
create or replace function public.can_read_enrollment(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e join courses c on c.id = e.course_id
    where e.id = target and (
      e.student_id = auth.uid()
      or (can_monitor(e.student_id) and c.deleted_at is null and (
        c.course_kind = 'predefined'
        or (c.course_kind = 'teacher' and c.owner_id = auth.uid())
      ))
    )
  );
$$;

drop policy if exists readable_enrollments on public.enrollments;
create policy readable_enrollments on public.enrollments for select to authenticated
  using (can_read_enrollment(id));

create or replace function public.enroll_course(p_student uuid, p_course uuid, p_mode text)
returns uuid language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if not exists (select 1 from profiles where id = p_student and role = 'student') then
    raise exception 'Student required';
  end if;
  if not exists (
    select 1 from courses c
    where c.id = p_course and c.deleted_at is null and (
      (c.course_kind = 'predefined' and c.status = 'published')
      or (c.course_kind = 'student' and c.owner_id = p_student and c.status in ('approved', 'published'))
      or (c.course_kind = 'teacher' and c.status = 'published' and exists (
        select 1 from monitoring_requests r
        where r.teacher_id = c.owner_id and r.student_id = p_student
          and r.status = 'approved' and r.student_approved_at is not null
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

revoke all on function public.can_monitor(uuid), public.can_read_enrollment(uuid),
  public.student_can_access_teacher_course(uuid) from public;
grant execute on function public.can_monitor(uuid), public.can_read_enrollment(uuid),
  public.student_can_access_teacher_course(uuid) to authenticated, service_role;
revoke execute on function public.enroll_course(uuid,uuid,text), public.consume_guardian_consent(text)
  from public, anon, authenticated;
grant execute on function public.enroll_course(uuid,uuid,text), public.consume_guardian_consent(text) to service_role;

notify pgrst, 'reload schema';
