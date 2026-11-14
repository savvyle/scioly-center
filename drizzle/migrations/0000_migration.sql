
create type public.app_role as enum ('student','captain','coach');

create table public.schools (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table public.teams (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade, division text not null check (division in ('B','C')), name text not null);

insert into public.schools (id, name) values ('00000000-0000-0000-0000-000000000001','KLS');
insert into public.teams (id, school_id, division, name) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000001','B','KLS Division B'),
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000001','C','KLS Division C');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  team_id uuid references public.teams(id),
  username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('captain','coach'))
$$;
create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  event text not null, year int, tournament text, level text,
  source_path text, key_path text,
  status text not null default 'uploaded',
  error text,
  question_count int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.schools(id),
  test_id uuid references public.tests(id) on delete cascade,
  event text not null, topic text, subtopic text,
  difficulty int not null default 2 check (difficulty between 1 and 3),
  year int, level text,
  stem text not null,
  choices jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  explanation text,
  image_urls text[] not null default '{}',
  status text not null default 'live' check (status in ('live','review','flagged','rejected')),
  ai_confidence numeric,
  converted_from_frq boolean not null default false,
  review_note text,
  created_at timestamptz not null default now()
);
create index on public.questions (event, status);

create table public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event text not null,
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  duration_sec int not null default 3000,
  finished_at timestamptz,
  score int, total int
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default '00000000-0000-0000-0000-000000000001',
  user_id uuid not null default auth.uid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  mode text not null check (mode in ('drill','mock')),
  chosen_index int,
  is_correct boolean not null,
  time_ms int,
  mock_id uuid references public.mock_tests(id) on delete set null,
  answered_at timestamptz not null default now()
);
create index on public.attempts (user_id, answered_at);
create index on public.attempts (answered_at);
create table public.review_state (
  user_id uuid not null, question_id uuid not null references public.questions(id) on delete cascade,
  box int not null default 0, due_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  reason text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz, resolved_by uuid, resolution text
);
create table public.settings (
  school_id uuid primary key references public.schools(id),
  goal_questions int not null default 15,
  goal_accuracy numeric not null default 0.6,
  family_sheet_url text
);
insert into public.settings (school_id) values ('00000000-0000-0000-0000-000000000001');

grant select on public.schools, public.teams, public.settings to authenticated;
grant update on public.settings to authenticated;
grant select on public.profiles, public.user_roles to authenticated;
grant select, insert, update, delete on public.tests, public.questions, public.flags, public.mock_tests to authenticated;
grant select, insert on public.attempts to authenticated;
grant select on public.review_state to authenticated;
grant all on public.schools, public.teams, public.profiles, public.user_roles, public.tests, public.questions, public.attempts, public.review_state, public.flags, public.settings, public.mock_tests to service_role;

alter table public.schools enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.review_state enable row level security;
alter table public.flags enable row level security;
alter table public.settings enable row level security;
alter table public.mock_tests enable row level security;

create policy "read schools" on public.schools for select to authenticated using (id = public.current_school_id());
create policy "read teams" on public.teams for select to authenticated using (school_id = public.current_school_id());
create policy "read settings" on public.settings for select to authenticated using (school_id = public.current_school_id());
create policy "coach updates settings" on public.settings for update to authenticated using (public.has_role(auth.uid(),'coach')) with check (public.has_role(auth.uid(),'coach'));
create policy "own or staff profile" on public.profiles for select to authenticated using (id = auth.uid() or (public.is_staff(auth.uid()) and school_id = public.current_school_id()));
create policy "own or staff roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "staff tests" on public.tests for all to authenticated using (public.is_staff(auth.uid()) and school_id = public.current_school_id()) with check (public.is_staff(auth.uid()) and school_id = public.current_school_id());
create policy "read live questions" on public.questions for select to authenticated using (school_id = public.current_school_id() and (status = 'live' or public.is_staff(auth.uid())));
create policy "read attempted questions" on public.questions for select to authenticated using (exists (select 1 from public.attempts a where a.question_id = questions.id and a.user_id = auth.uid()));
create policy "staff write questions" on public.questions for insert to authenticated with check (public.is_staff(auth.uid()) and school_id = public.current_school_id());
create policy "staff update questions" on public.questions for update to authenticated using (public.is_staff(auth.uid()) and school_id = public.current_school_id());
create policy "staff delete questions" on public.questions for delete to authenticated using (public.is_staff(auth.uid()) and school_id = public.current_school_id());
create policy "insert own attempts" on public.attempts for insert to authenticated with check (user_id = auth.uid() and school_id = public.current_school_id());
create policy "read own or staff attempts" on public.attempts for select to authenticated using (user_id = auth.uid() or (public.is_staff(auth.uid()) and school_id = public.current_school_id()));
create policy "own review state" on public.review_state for select to authenticated using (user_id = auth.uid());
create policy "insert own flags" on public.flags for insert to authenticated with check (user_id = auth.uid());
create policy "read own or staff flags" on public.flags for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "staff update flags" on public.flags for update to authenticated using (public.is_staff(auth.uid()));
create policy "own mocks" on public.mock_tests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read mocks" on public.mock_tests for select to authenticated using (public.is_staff(auth.uid()));

create or replace function public.apply_leitner() returns trigger language plpgsql security definer set search_path = public as $$
declare cur int; nb int;
begin
  select box into cur from public.review_state where user_id = new.user_id and question_id = new.question_id;
  if cur is null then cur := 0; end if;
  if new.is_correct then
    nb := least(cur + 1, 4);
    insert into public.review_state (user_id, question_id, box, due_at)
    values (new.user_id, new.question_id, nb, now() + (case nb when 1 then 1 when 2 then 3 when 3 then 7 else 21 end) * interval '1 day')
    on conflict (user_id, question_id) do update set box = excluded.box, due_at = excluded.due_at;
  else
    insert into public.review_state (user_id, question_id, box, due_at) values (new.user_id, new.question_id, 0, now())
    on conflict (user_id, question_id) do update set box = 0, due_at = now();
  end if;
  return new;
end $$;
create trigger attempts_leitner after insert on public.attempts for each row execute function public.apply_leitner();

create or replace function public.on_flag() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.questions set status = 'flagged' where id = new.question_id and status = 'live';
  return new;
end $$;
create trigger flags_pull after insert on public.flags for each row execute function public.on_flag();

create or replace function public.next_drill_question(p_event text default null, p_topic text default null, p_difficulty int default null, p_exclude uuid[] default '{}')
returns uuid language plpgsql volatile security invoker set search_path = public as $$
declare qid uuid; prefer_due boolean := random() < 0.3;
begin
  if prefer_due then
    select q.id into qid from public.questions q join public.review_state r on r.question_id = q.id and r.user_id = auth.uid()
    where q.status = 'live' and r.due_at <= now() and not (q.id = any(p_exclude))
      and (p_event is null or q.event = p_event) and (p_topic is null or q.topic = p_topic) and (p_difficulty is null or q.difficulty = p_difficulty)
    order by r.due_at limit 1;
    if qid is not null then return qid; end if;
  end if;
  select q.id into qid from public.questions q
  where q.status = 'live' and not (q.id = any(p_exclude))
    and not exists (select 1 from public.review_state r where r.question_id = q.id and r.user_id = auth.uid())
    and (p_event is null or q.event = p_event) and (p_topic is null or q.topic = p_topic) and (p_difficulty is null or q.difficulty = p_difficulty)
  order by random() limit 1;
  if qid is not null then return qid; end if;
  select q.id into qid from public.questions q join public.review_state r on r.question_id = q.id and r.user_id = auth.uid()
  where q.status = 'live' and r.due_at <= now() and not (q.id = any(p_exclude))
    and (p_event is null or q.event = p_event) and (p_topic is null or q.topic = p_topic) and (p_difficulty is null or q.difficulty = p_difficulty)
  order by r.due_at limit 1;
  return qid;
end $$;

create or replace function public.week_bounds(p_offset int default 0, out week_start timestamptz, out week_end timestamptz)
language sql stable as $$
  with t as (select (now() at time zone 'America/Los_Angeles') as local_now),
  s as (select date_trunc('day', local_now) - (((extract(dow from local_now)::int + 1) % 7) + 7 * p_offset) * interval '1 day' as local_start from t)
  select (local_start at time zone 'America/Los_Angeles'), ((local_start + interval '7 days') at time zone 'America/Los_Angeles') from s
$$;

create or replace function public.weekly_leaderboard(p_offset int default 0)
returns table(user_id uuid, display_name text, division text, answered int, correct int, accuracy numeric, rank int, week_start timestamptz, week_end timestamptz)
language sql stable security definer set search_path = public as $$
  with b as (select * from public.week_bounds(p_offset)),
  students as (
    select p.id, p.display_name, t.division from public.profiles p left join public.teams t on t.id = p.team_id
    where p.school_id = public.current_school_id()
      and exists (select 1 from public.user_roles r where r.user_id = p.id and r.role in ('student','captain'))
  ),
  agg as (
    select s.id, s.display_name, s.division,
      count(a.id)::int as answered, count(a.id) filter (where a.is_correct)::int as correct
    from students s left join public.attempts a on a.user_id = s.id and a.answered_at >= (select week_start from b) and a.answered_at < (select week_end from b)
    group by s.id, s.display_name, s.division
  )
  select id, display_name, division, answered, correct,
    case when answered > 0 then round(correct::numeric / answered, 4) else 0 end as accuracy,
    (rank() over (order by correct desc, (case when answered > 0 then correct::numeric / answered else 0 end) desc))::int,
    (select week_start from b), (select week_end from b)
  from agg order by 7, 2
$$;

create or replace function public.stats_by_topic(p_user uuid default null, p_division text default null)
returns table(event text, topic text, answered int, correct int)
language sql stable security invoker set search_path = public as $$
  select q.event, coalesce(q.topic,'General'), count(*)::int, count(*) filter (where a.is_correct)::int
  from public.attempts a join public.questions q on q.id = a.question_id
  left join public.profiles p on p.id = a.user_id left join public.teams t on t.id = p.team_id
  where (p_user is null or a.user_id = p_user) and (p_division is null or t.division = p_division)
  group by 1, 2 order by 1, 2
$$;

create or replace function public.daily_trend(p_user uuid default null, p_days int default 28)
returns table(day date, answered int, correct int)
language sql stable security invoker set search_path = public as $$
  select (a.answered_at at time zone 'America/Los_Angeles')::date, count(*)::int, count(*) filter (where a.is_correct)::int
  from public.attempts a
  where (p_user is null or a.user_id = p_user) and a.answered_at > now() - p_days * interval '1 day'
  group by 1 order by 1
$$;

grant execute on function public.has_role, public.is_staff, public.current_school_id, public.next_drill_question, public.week_bounds, public.weekly_leaderboard, public.stats_by_topic, public.daily_trend to authenticated;

create policy "staff manage test files" on storage.objects for all to authenticated using (bucket_id = 'tests' and public.is_staff(auth.uid())) with check (bucket_id = 'tests' and public.is_staff(auth.uid()));
create policy "staff upload question images" on storage.objects for insert to authenticated with check (bucket_id = 'question-images' and public.is_staff(auth.uid()));
create policy "read question images" on storage.objects for select to authenticated using (bucket_id = 'question-images');
