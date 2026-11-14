alter table public.tests add column division text check (division in ('B','C'));
alter table public.tests add column source_ref text;
alter table public.questions add column division text check (division in ('B','C'));