-- gen_random_uuid() is built into PostgreSQL 13+; no optional extensions are required.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student','teacher')),
  display_name text not null check (length(display_name) between 2 and 100),
  student_code text unique,
  age_band text check (age_band in ('under18','adult')),
  guardian_email text,
  grade text,
  institution text,
  created_at timestamptz not null default now(),
  check ((role = 'student' and student_code is not null and age_band is not null) or (role = 'teacher' and student_code is null)),
  check (role <> 'student' or age_band <> 'under18' or guardian_email is not null)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null, subject text not null, grade text not null,
  description text not null,
  status text not null check (status in ('draft','approved','published')),
  source_path text,
  created_at timestamptz not null default now(),
  check (owner_id is not null or status = 'published')
);
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null, title text not null, summary text not null,
  order_index int not null,
  content jsonb not null,
  unique (course_id, slug), unique (id, course_id)
);
create table public.prerequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  concept_id uuid not null,
  prerequisite_id uuid not null,
  primary key (concept_id, prerequisite_id),
  foreign key (concept_id, course_id) references public.concepts(id, course_id) on delete cascade,
  foreign key (prerequisite_id, course_id) references public.concepts(id, course_id) on delete cascade,
  check (concept_id <> prerequisite_id)
);
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  mode text not null default 'scratch' check (mode in ('scratch','prior')),
  status text not null default 'diagnostic' check (status in ('diagnostic','learning','completed')),
  diagnostic_count int not null default 0 check (diagnostic_count between 0 and 10),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (student_id, course_id)
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  kind text not null check (kind in ('diagnostic','learning','revision')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  prompt text not null, options jsonb not null default '[]',
  correct_answer text not null, explanation text not null, rubric text not null,
  fingerprint text not null,
  source text not null check (source in ('bank','ai')),
  validated boolean not null default false,
  created_at timestamptz not null default now(),
  unique (enrollment_id, fingerprint)
);
create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(id) on delete cascade,
  current_question_id uuid references public.questions(id),
  current_lesson jsonb,
  answer_draft jsonb not null default '{}',
  next_action text not null default 'teach' check (next_action in ('teach','reteach','retest','continue')),
  last_attempt_id uuid,
  revision_concept_id uuid references public.concepts(id),
  version int not null default 0,
  operation_token uuid, operation_until timestamptz,
  updated_at timestamptz not null default now()
);
create table public.diagnostics (
  enrollment_id uuid primary key references public.enrollments(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  result jsonb, completed_at timestamptz
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  question_id uuid not null unique references public.questions(id),
  concept_id uuid not null references public.concepts(id),
  answer text not null, reasoning text not null check (length(trim(reasoning)) >= 3),
  dont_know boolean not null default false,
  evaluation jsonb not null,
  mastery_after numeric not null check (mastery_after between 0 and 1),
  action text not null check (action in ('teach','reteach','retest','continue')),
  created_at timestamptz not null default now()
);
alter table public.learning_sessions add constraint session_attempt_fk foreign key (last_attempt_id) references public.attempts(id);
create table public.concept_mastery (
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  concept_id uuid not null references public.concepts(id),
  score numeric not null check (score between 0 and 1),
  alpha numeric not null check (alpha >= 1), beta numeric not null check (beta >= 1),
  attempts int not null, correct_count int not null, sound_count int not null,
  reasoning_total numeric not null,
  last_difficulty text not null check (last_difficulty in ('easy','medium','hard')),
  updated_at timestamptz not null default now(),
  primary key (enrollment_id, concept_id)
);
create table public.misconceptions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  concept_id uuid not null references public.concepts(id),
  key text not null, description text not null, evidence text not null,
  occurrences int not null default 1, confirmations int not null default 0,
  status text not null default 'active' check (status in ('active','corrected')),
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  unique (enrollment_id, concept_id, key)
);
create table public.revision_schedules (
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  concept_id uuid not null references public.concepts(id),
  due_at timestamptz not null, interval_days int not null check (interval_days between 1 and 90),
  ease numeric not null check (ease between 1.3 and 2.8),
  reviews int not null default 0, lapses int not null default 0, last_reviewed_at timestamptz,
  primary key (enrollment_id, concept_id)
);
create table public.question_bank (
  id uuid primary key default gen_random_uuid(), concept_id uuid not null references public.concepts(id),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  prompt text not null, options jsonb not null default '[]', correct_answer text not null,
  explanation text not null, rubric text not null,
  unique (concept_id, prompt)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, subject text not null, created_at timestamptz not null default now(),
  unique (id, teacher_id)
);
create table public.monitoring_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null, teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending_student' check (status in ('pending_student','pending_guardian','approved','rejected','revoked')),
  student_approved_at timestamptz, guardian_approved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (class_id, teacher_id) references public.classes(id, teacher_id) on delete cascade,
  unique (class_id, student_id),
  check (teacher_id <> student_id),
  check (status <> 'approved' or student_approved_at is not null)
);
create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.monitoring_requests(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null, consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.rate_limits (
  bucket text primary key, count int not null default 1, expires_at timestamptz not null
);

create index enrollment_student_idx on public.enrollments(student_id, updated_at desc);
create index attempts_history_idx on public.attempts(enrollment_id, created_at);
create index questions_history_idx on public.questions(enrollment_id, created_at);
create index monitoring_access_idx on public.monitoring_requests(teacher_id, student_id, status);
create index revision_due_idx on public.revision_schedules(due_at);
create index concepts_course_idx on public.concepts(course_id, order_index);
create index rate_limit_expiry_idx on public.rate_limits(expires_at);

create function public.guard_monitoring() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = new.teacher_id and role = 'teacher')
     or not exists (select 1 from profiles where id = new.student_id and role = 'student') then
    raise exception 'Invalid monitoring roles';
  end if;
  if new.status = 'approved' and exists (select 1 from profiles where id = new.student_id and age_band = 'under18')
     and new.guardian_approved_at is null then raise exception 'Guardian approval is required'; end if;
  return new;
end;
$$;
create trigger enforce_monitoring_consent before insert or update on public.monitoring_requests for each row execute function public.guard_monitoring();

create function public.can_monitor(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from monitoring_requests r join profiles p on p.id = r.student_id
    where r.teacher_id = auth.uid() and r.student_id = target and r.status = 'approved'
    and r.student_approved_at is not null and (p.age_band = 'adult' or r.guardian_approved_at is not null));
$$;
create function public.can_read_enrollment(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from enrollments where id = target and (student_id = auth.uid() or can_monitor(student_id)));
$$;
create function public.can_read_course(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses where id = target and (status = 'published' or owner_id = auth.uid()))
    or exists (select 1 from enrollments where course_id = target and can_monitor(student_id));
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.concepts enable row level security;
alter table public.prerequisites enable row level security;
alter table public.enrollments enable row level security;
alter table public.questions enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.diagnostics enable row level security;
alter table public.attempts enable row level security;
alter table public.concept_mastery enable row level security;
alter table public.misconceptions enable row level security;
alter table public.revision_schedules enable row level security;
alter table public.question_bank enable row level security;
alter table public.classes enable row level security;
alter table public.monitoring_requests enable row level security;
alter table public.guardian_consents enable row level security;
alter table public.rate_limits enable row level security;

create policy profile_self on public.profiles for select to authenticated using (id = auth.uid());
create policy readable_courses on public.courses for select to authenticated using (can_read_course(id));
create policy readable_concepts on public.concepts for select to authenticated using (can_read_course(course_id));
create policy readable_dependencies on public.prerequisites for select to authenticated using (can_read_course(course_id));
create policy readable_enrollments on public.enrollments for select to authenticated using (student_id = auth.uid() or can_monitor(student_id));
create policy own_sessions on public.learning_sessions for select to authenticated using (exists (select 1 from enrollments where id = enrollment_id and student_id = auth.uid()));
create policy readable_diagnostics on public.diagnostics for select to authenticated using (can_read_enrollment(enrollment_id));
create policy readable_attempts on public.attempts for select to authenticated using (can_read_enrollment(enrollment_id));
create policy readable_mastery on public.concept_mastery for select to authenticated using (can_read_enrollment(enrollment_id));
create policy readable_misconceptions on public.misconceptions for select to authenticated using (can_read_enrollment(enrollment_id));
create policy readable_revision on public.revision_schedules for select to authenticated using (can_read_enrollment(enrollment_id));
create policy own_classes on public.classes for select to authenticated using (teacher_id = auth.uid());
create policy own_requests on public.monitoring_requests for select to authenticated using (teacher_id = auth.uid() or student_id = auth.uid());

-- Browser clients have no write privileges. All mutations pass authenticated server validation.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.courses, public.concepts, public.prerequisites,
  public.enrollments, public.learning_sessions, public.diagnostics, public.attempts,
  public.concept_mastery, public.misconceptions, public.revision_schedules, public.classes,
  public.monitoring_requests to authenticated;
grant all on all tables in schema public to service_role;
revoke all on function public.can_monitor(uuid), public.can_read_enrollment(uuid), public.can_read_course(uuid) from public;
grant execute on function public.can_monitor(uuid), public.can_read_enrollment(uuid), public.can_read_course(uuid) to authenticated, service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('syllabuses', 'syllabuses', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;
create policy private_syllabus_reads on storage.objects for select to authenticated using (bucket_id = 'syllabuses' and (storage.foldername(name))[1] = auth.uid()::text);

create function public.enroll_course(p_student uuid, p_course uuid, p_mode text) returns uuid
language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if not exists (select 1 from profiles where id = p_student and role = 'student') then raise exception 'Student required'; end if;
  if not exists (select 1 from courses where id = p_course and (status = 'published' or (status = 'approved' and owner_id = p_student))) then raise exception 'Course not approved'; end if;
  insert into enrollments(student_id, course_id, mode) values (p_student, p_course, p_mode)
    on conflict (student_id, course_id) do nothing returning id into eid;
  if eid is null then select id into eid from enrollments where student_id = p_student and course_id = p_course; end if;
  insert into learning_sessions(enrollment_id) values (eid) on conflict do nothing;
  insert into diagnostics(enrollment_id) values (eid) on conflict do nothing;
  return eid;
end;
$$;

create function public.claim_session(p_enrollment uuid, p_token uuid, p_version int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update learning_sessions set operation_token = p_token, operation_until = now() + interval '4 minutes'
    where enrollment_id = p_enrollment and version = p_version and (operation_until is null or operation_until < now());
  get diagnostics n = row_count; return n = 1;
end;
$$;
create function public.release_session(p_enrollment uuid, p_token uuid) returns void
language sql security definer set search_path = public as $$
  update learning_sessions set operation_token = null, operation_until = null where enrollment_id = p_enrollment and operation_token = p_token;
$$;

create function public.save_question(p_enrollment uuid, p_token uuid, p_question jsonb, p_lesson jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare s learning_sessions; qid uuid;
begin
  select * into s from learning_sessions where enrollment_id = p_enrollment for update;
  if s.operation_token is distinct from p_token or s.operation_until < now() then raise exception 'Session changed. Please reload.'; end if;
  if s.current_question_id is not null and not exists (select 1 from attempts where question_id = s.current_question_id) then raise exception 'Answer the current question first'; end if;
  if not exists (select 1 from concepts c join enrollments e on c.course_id = e.course_id where e.id = p_enrollment and c.id = (p_question->>'concept_id')::uuid) then raise exception 'Concept is outside this syllabus'; end if;
  if (select status from enrollments where id = p_enrollment) = 'diagnostic' and p_question->>'kind' <> 'diagnostic' then raise exception 'Diagnostic required'; end if;
  if (select status from enrollments where id = p_enrollment) <> 'diagnostic' and p_question->>'kind' = 'diagnostic' then raise exception 'Diagnostic already completed'; end if;
  insert into questions(enrollment_id, concept_id, kind, difficulty, prompt, options, correct_answer, explanation, rubric, fingerprint, source, validated)
    values (p_enrollment, (p_question->>'concept_id')::uuid, p_question->>'kind', p_question->>'difficulty', p_question->>'prompt', p_question->'options', p_question->>'correct_answer', p_question->>'explanation', p_question->>'rubric', p_question->>'fingerprint', p_question->>'source', true) returning id into qid;
  update learning_sessions set current_question_id = qid, current_lesson = p_lesson, last_attempt_id = null, answer_draft = '{}',
    revision_concept_id = case when p_question->>'kind' = 'revision' then (p_question->>'concept_id')::uuid else null end,
    operation_token = null, operation_until = null, version = version + 1, updated_at = now() where enrollment_id = p_enrollment;
  update enrollments set updated_at = now() where id = p_enrollment;
  return qid;
end;
$$;

create function public.commit_answer(
  p_enrollment uuid, p_question uuid, p_token uuid, p_answer text, p_reasoning text,
  p_dont_know boolean, p_evaluation jsonb, p_mastery jsonb, p_revision jsonb,
  p_action text, p_diagnostic jsonb, p_complete boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare s learning_sessions; q questions; aid uuid; m jsonb; k text;
begin
  select * into s from learning_sessions where enrollment_id = p_enrollment for update;
  select id into aid from attempts where question_id = p_question and enrollment_id = p_enrollment;
  if aid is not null then return aid; end if;
  if s.operation_token is distinct from p_token or s.operation_until < now() or s.current_question_id is distinct from p_question then raise exception 'Session changed. Please reload.'; end if;
  select * into strict q from questions where id = p_question and enrollment_id = p_enrollment and validated;
  insert into attempts(enrollment_id, question_id, concept_id, answer, reasoning, dont_know, evaluation, mastery_after, action)
    values (p_enrollment, p_question, q.concept_id, p_answer, p_reasoning, p_dont_know, p_evaluation, (p_mastery->>'score')::numeric, p_action) returning id into aid;
  insert into concept_mastery(enrollment_id, concept_id, score, alpha, beta, attempts, correct_count, sound_count, reasoning_total, last_difficulty)
    values (p_enrollment, q.concept_id, (p_mastery->>'score')::numeric, (p_mastery->>'alpha')::numeric, (p_mastery->>'beta')::numeric,
      (p_mastery->>'attempts')::int, (p_mastery->>'correct_count')::int, (p_mastery->>'sound_count')::int, (p_mastery->>'reasoning_total')::numeric, q.difficulty)
    on conflict (enrollment_id, concept_id) do update set score = excluded.score, alpha = excluded.alpha, beta = excluded.beta,
      attempts = excluded.attempts, correct_count = excluded.correct_count, sound_count = excluded.sound_count,
      reasoning_total = excluded.reasoning_total, last_difficulty = excluded.last_difficulty, updated_at = now();
  for m in select * from jsonb_array_elements(p_evaluation->'misconceptions') loop
    insert into misconceptions(enrollment_id, concept_id, key, description, evidence)
      values (p_enrollment, q.concept_id, m->>'key', m->>'description', m->>'evidence')
      on conflict (enrollment_id, concept_id, key) do update set occurrences = misconceptions.occurrences + 1,
        confirmations = 0, status = 'active', evidence = excluded.evidence, last_seen_at = now();
  end loop;
  for k in select jsonb_array_elements_text(p_evaluation->'resolved_misconceptions') loop
    update misconceptions set confirmations = confirmations + 1,
      status = case when confirmations + 1 >= 2 then 'corrected' else 'active' end, last_seen_at = now()
      where enrollment_id = p_enrollment and concept_id = q.concept_id and key = k and status = 'active';
  end loop;
  insert into revision_schedules(enrollment_id, concept_id, due_at, interval_days, ease, reviews, lapses, last_reviewed_at)
    values (p_enrollment, q.concept_id, (p_revision->>'due_at')::timestamptz, (p_revision->>'interval_days')::int,
      (p_revision->>'ease')::numeric, (p_revision->>'reviews')::int, (p_revision->>'lapses')::int, (p_revision->>'last_reviewed_at')::timestamptz)
    on conflict (enrollment_id, concept_id) do update set due_at = excluded.due_at, interval_days = excluded.interval_days,
      ease = excluded.ease, reviews = excluded.reviews, lapses = excluded.lapses, last_reviewed_at = excluded.last_reviewed_at;
  if q.kind = 'diagnostic' then
    update enrollments set diagnostic_count = diagnostic_count + 1 where id = p_enrollment;
    if p_diagnostic is not null then
      update diagnostics set status = 'completed', result = p_diagnostic, completed_at = now() where enrollment_id = p_enrollment;
      update enrollments set status = 'learning', mode = p_diagnostic->>'recommended_mode' where id = p_enrollment;
    end if;
  elsif p_complete then update enrollments set status = 'completed' where id = p_enrollment;
  elsif q.kind = 'revision' and p_action <> 'continue' then update enrollments set status = 'learning' where id = p_enrollment;
  end if;
  update enrollments set updated_at = now() where id = p_enrollment;
  update learning_sessions set last_attempt_id = aid, next_action = p_action, answer_draft = '{}', operation_token = null, operation_until = null,
    version = version + 1, updated_at = now() where enrollment_id = p_enrollment;
  return aid;
end;
$$;

create function public.create_custom_course(p_owner uuid, p_syllabus jsonb, p_path text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; topic jsonb; dep text; i int := 0;
begin
  if not exists (select 1 from profiles where id = p_owner and role = 'student') then raise exception 'Student required'; end if;
  insert into courses(owner_id,title,subject,grade,description,status,source_path)
    values (p_owner,p_syllabus->>'title',p_syllabus->>'subject',p_syllabus->>'grade',p_syllabus->>'description','draft',p_path) returning id into cid;
  for topic in select * from jsonb_array_elements(p_syllabus->'concepts') loop
    insert into concepts(course_id,slug,title,summary,order_index,content) values (cid,topic->>'slug',topic->>'title',topic->>'summary',i,topic->'content'); i := i+1;
  end loop;
  for topic in select * from jsonb_array_elements(p_syllabus->'concepts') loop
    for dep in select jsonb_array_elements_text(topic->'prerequisites') loop
      insert into prerequisites(course_id,concept_id,prerequisite_id)
        select cid,c.id,p.id from concepts c, concepts p where c.course_id = cid and p.course_id = cid and c.slug = topic->>'slug' and p.slug = dep;
    end loop;
  end loop;
  return cid;
end;
$$;

create function public.consume_guardian_consent(p_hash text) returns boolean
language plpgsql security definer set search_path = public as $$
declare consent guardian_consents;
begin
  select * into consent from guardian_consents where token_hash = p_hash and consumed_at is null and expires_at > now() for update;
  if not found then return false; end if;
  update monitoring_requests set guardian_approved_at = now(), status = 'approved'
    where id = consent.request_id and status = 'pending_guardian' and student_approved_at is not null;
  if not found then return false; end if;
  update guardian_consents set consumed_at = now() where id = consent.id;
  return true;
end;
$$;

create function public.check_rate_limit(p_bucket text, p_limit int, p_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from rate_limits where expires_at < now() - interval '1 day';
  insert into rate_limits(bucket,count,expires_at) values (p_bucket,1,now() + make_interval(secs => p_seconds))
    on conflict (bucket) do update set count = case when rate_limits.expires_at <= now() then 1 else rate_limits.count + 1 end,
      expires_at = case when rate_limits.expires_at <= now() then now() + make_interval(secs => p_seconds) else rate_limits.expires_at end
    returning count into n;
  return n <= p_limit;
end;
$$;

-- Never expose privileged mutation RPCs to a logged-in browser or anonymous caller.
revoke execute on function public.enroll_course(uuid,uuid,text), public.claim_session(uuid,uuid,int),
  public.release_session(uuid,uuid), public.save_question(uuid,uuid,jsonb,jsonb),
  public.commit_answer(uuid,uuid,uuid,text,text,boolean,jsonb,jsonb,jsonb,text,jsonb,boolean),
  public.create_custom_course(uuid,jsonb,text), public.consume_guardian_consent(text),
  public.check_rate_limit(text,int,int), public.guard_monitoring() from public, anon, authenticated;
grant execute on function public.enroll_course(uuid,uuid,text), public.claim_session(uuid,uuid,int),
  public.release_session(uuid,uuid), public.save_question(uuid,uuid,jsonb,jsonb),
  public.commit_answer(uuid,uuid,uuid,text,text,boolean,jsonb,jsonb,jsonb,text,jsonb,boolean),
  public.create_custom_course(uuid,jsonb,text), public.consume_guardian_consent(text),
  public.check_rate_limit(text,int,int) to service_role;

create function public.set_learning_mode(p_enrollment uuid, p_mode text) returns boolean
language plpgsql security definer set search_path = public as $$
declare s learning_sessions;
begin
  select * into strict s from learning_sessions where enrollment_id = p_enrollment for update;
  if s.operation_until > now() then return false; end if;
  update enrollments set mode = p_mode, updated_at = now() where id = p_enrollment;
  update learning_sessions set version = version + 1, updated_at = now() where enrollment_id = p_enrollment;
  return true;
end;
$$;
revoke execute on function public.set_learning_mode(uuid,text) from public, anon, authenticated;
grant execute on function public.set_learning_mode(uuid,text) to service_role;
