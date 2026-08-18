-- Run this once in the Supabase SQL editor if the app is already live.

create table if not exists household_users (
  name text primary key,
  created_at timestamptz not null default now()
);

insert into household_users (name)
select distinct created_by from expenses
where created_by is not null and created_by <> ''
on conflict (name) do nothing;
