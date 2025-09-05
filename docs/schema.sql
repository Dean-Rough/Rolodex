-- Supabase schema for Rolodex

-- Enable pgvector extension for vector similarity search
create extension if not exists vector;

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
  embedding vector(1536), -- OpenAI text-embedding-3-small has 1536 dimensions
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

-- Performance indexes for common queries
create index if not exists idx_items_created_at on items (created_at desc);
create index if not exists idx_items_vendor on items (vendor);
create index if not exists idx_items_colour_hex on items (colour_hex);
create index if not exists idx_items_owner_id on items (owner_id);

-- Vector similarity index for semantic search
create index if not exists idx_items_embedding on items 
using ivfflat (embedding vector_cosine_ops) 
with (lists = 100);

-- Search function for vector similarity with user filtering
create or replace function search_items_by_embedding(
  query_embedding vector(1536),
  user_id uuid,
  similarity_threshold float default 0.7,
  max_results int default 20
)
returns table (
  id uuid,
  img_url text,
  title text,
  vendor text,
  price numeric,
  currency text,
  description text,
  colour_hex char(7),
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
