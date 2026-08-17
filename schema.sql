-- Run this in the Supabase SQL editor.

create table if not exists categories (
  id text primary key,
  name text not null unique,
  color text not null
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(10, 2) not null,
  category_id text not null references categories(id),
  description text,
  expense_date date not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on expenses (expense_date desc);
create index if not exists expenses_category_idx on expenses (category_id);
create index if not exists expenses_created_by_idx on expenses (created_by);

insert into categories (id, name, color) values
  ('cat-food', 'Food', '#D4652F'),
  ('cat-groceries', 'Groceries', '#1B6B4F'),
  ('cat-transport', 'Transport', '#2F6FED'),
  ('cat-rent', 'Rent', '#7C3AED'),
  ('cat-utilities', 'Utilities', '#0F766E'),
  ('cat-medical', 'Medical', '#BE123C'),
  ('cat-entertainment', 'Entertainment', '#C2410C'),
  ('cat-shopping', 'Shopping', '#A16207'),
  ('cat-other', 'Other', '#57534E')
on conflict (id) do nothing;
