-- Supabase schema for Rolodex
-- Source of truth: backend/models.py
-- Run against Supabase SQL editor or via migration tool.

-- Enable pgvector extension for vector similarity search
create extension if not exists vector;

-- ──────────────────────────────────────────────
-- Users
-- ──────────────────────────────────────────────
create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- ──────────────────────────────────────────────
-- Items (FF&E products)
-- ──────────────────────────────────────────────
create table if not exists items (
  id text primary key,
  owner_id text references users(id) on delete cascade not null,
  img_url text not null,
  title text,
  vendor text,
  price float,
  currency varchar(8),
  description text,
  colour_hex varchar(7),
  category text,
  material text,
  src_url text,
  embedding jsonb,                   -- OpenAI text-embedding-3-small (1536-d)
  image_embedding jsonb,             -- CLIP image embedding for visual similarity
  color_palette jsonb,               -- Array of ~5 dominant hex colors
  tags jsonb default '[]'::jsonb,    -- User-applied tags
  style_tags jsonb default '[]'::jsonb, -- AI-detected style tags
  notes text,                        -- User notes
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- ──────────────────────────────────────────────
-- Projects
-- ──────────────────────────────────────────────
create table if not exists projects (
  id text primary key,
  owner_id text references users(id) on delete cascade not null,
  name text not null,
  budget float,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- ──────────────────────────────────────────────
-- Project ↔ Item join table
-- ──────────────────────────────────────────────
create table if not exists project_items (
  project_id text references projects(id) on delete cascade,
  item_id text references items(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (project_id, item_id)
);

-- ──────────────────────────────────────────────
-- Saved Searches
-- ──────────────────────────────────────────────
create table if not exists saved_searches (
  id text primary key,
  owner_id text references users(id) on delete cascade not null,
  name varchar(255) not null,
  filters jsonb not null,
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────────
-- Performance indexes
-- ──────────────────────────────────────────────
create index if not exists idx_items_created_at on items (created_at desc);
create index if not exists idx_items_owner_id on items (owner_id);
create index if not exists idx_items_vendor on items (vendor);
create index if not exists idx_items_colour_hex on items (colour_hex);
create index if not exists idx_projects_owner on projects (owner_id);
create index if not exists idx_saved_searches_owner on saved_searches (owner_id);

-- Vector similarity index (requires embedding column to be vector type on Supabase)
-- If using native pgvector column instead of jsonb:
-- alter table items add column embedding_vec vector(1536);
-- create index if not exists idx_items_embedding on items
--   using ivfflat (embedding_vec vector_cosine_ops)
--   with (lists = 100);

-- Search function for vector similarity with user filtering
create or replace function search_items_by_embedding(
  query_embedding vector(1536),
  user_id text,
  similarity_threshold float default 0.7,
  max_results int default 20
)
returns table (
  id text,
  img_url text,
  title text,
  vendor text,
  price float,
  currency text,
  description text,
  colour_hex varchar(7),
  category text,
  material text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    i.id,
    i.img_url,
    i.title,
    i.vendor,
    i.price,
    i.currency,
    i.description,
    i.colour_hex,
    i.category,
    i.material,
    i.created_at,
    1 - (i.embedding <=> query_embedding) as similarity
  from items i
  where i.owner_id = user_id
    and i.embedding is not null
    and 1 - (i.embedding <=> query_embedding) > similarity_threshold
  order by i.embedding <=> query_embedding
  limit max_results;
$$;
