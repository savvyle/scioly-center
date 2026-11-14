create table public.student_events (
  user_id uuid not null,
  event text not null,
  division text not null check (division in ('B','C')),
  conflict_group int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event),
  unique (user_id, division, conflict_group)
);
grant select, insert, delete on public.student_events to authenticated;
grant all on public.student_events to service_role;
alter table public.student_events enable row level security;
create policy "own events read" on public.student_events for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "own events insert" on public.student_events for insert to authenticated with check (user_id = auth.uid());
create policy "own events delete" on public.student_events for delete to authenticated using (user_id = auth.uid());
create policy "staff manage events insert" on public.student_events for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff manage events delete" on public.student_events for delete to authenticated using (public.is_staff(auth.uid()));