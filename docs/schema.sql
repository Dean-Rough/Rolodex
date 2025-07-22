-- Supabase schema for Rolodex

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id),
  img_url text,
  title text,
  vendor text,
  price numeric,
  currency text,
  description text,
  colour_hex char(7),
  category text,
  material text,
  src_url text,
  embedding vector(512),
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id),
  name text,
  created_at timestamptz default now()
);

create table if not exists project_items (
  project_id uuid references projects(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  primary key (project_id, item_id)
); 