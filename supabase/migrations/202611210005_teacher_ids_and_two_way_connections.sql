-- Teacher IDs and student-initiated teacher connections. Existing rows and learning data are preserved.
alter table public.profiles add column if not exists teacher_code text;
update public.profiles set teacher_code = 'THT-' || upper(substr(replace(id::text, '-', ''), 1, 10)) where role = 'teacher' and teacher_code is null;
create unique index if not exists profiles_teacher_code_key on public.profiles(teacher_code) where teacher_code is not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_teacher_code_check') then
    alter table public.profiles add constraint profiles_teacher_code_check check ((role = 'teacher' and teacher_code is not null) or (role = 'student' and teacher_code is null));
  end if;
end $$;

alter table public.monitoring_requests add column if not exists initiated_by text not null default 'teacher';
alter table public.monitoring_requests drop constraint if exists monitoring_requests_status_check;
alter table public.monitoring_requests add constraint monitoring_requests_status_check check (status in ('pending_teacher','pending_student','pending_guardian','approved','rejected','revoked'));
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'monitoring_requests_initiated_by_check') then
    alter table public.monitoring_requests add constraint monitoring_requests_initiated_by_check check (initiated_by in ('teacher','student'));
  end if;
end $$;

-- A student-initiated request is the student's own approval; only the teacher's decision remains.
create or replace function public.guard_monitoring() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = new.teacher_id and role = 'teacher')
     or not exists (select 1 from profiles where id = new.student_id and role = 'student') then
    raise exception 'Invalid monitoring roles';
  end if;
  if new.status = 'approved' and exists (select 1 from profiles where id = new.student_id and age_band = 'under18')
     and new.guardian_approved_at is null then raise exception 'Guardian approval is required'; end if;
  if new.status in ('pending_teacher','pending_guardian','approved') and new.student_approved_at is null then
    raise exception 'Student approval is required';
  end if;
  return new;
end;
$$;
