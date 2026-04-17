-- ResumeChat schema
-- Run this in the Supabase SQL editor

create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- Profiles (candidates)
create table if not exists profiles (
  id uuid references auth.users primary key,
  full_name text,
  username text unique,
  linkedin_url text,
  headline text,
  created_at timestamptz default now()
);

-- Uploaded resumes
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  file_url text,
  raw_text text,
  parsed_sections jsonb,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- Project links
create table if not exists project_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text,
  url text,
  scraped_content text,
  created_at timestamptz default now()
);

-- Resume chunks for RAG
create table if not exists resume_chunks (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references resumes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text,
  chunk_index int,
  embedding vector(1536),
  metadata jsonb
);

-- Chat sessions (recruiter side)
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  session_token text unique,
  question_count int default 0,
  created_at timestamptz default now(),
  last_active timestamptz default now()
);

-- Chat messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text,
  content text,
  created_at timestamptz default now()
);

-- Analytics
create table if not exists resume_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  session_id uuid references chat_sessions(id) on delete cascade,
  viewed_at timestamptz default now()
);

-- Vector similarity index
create index if not exists resume_chunks_embedding_idx
  on resume_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists resume_chunks_user_id_idx on resume_chunks(user_id);
create index if not exists resumes_user_id_idx on resumes(user_id);
create index if not exists chat_sessions_user_id_idx on chat_sessions(user_id);
create index if not exists chat_messages_session_id_idx on chat_messages(session_id);
create index if not exists resume_views_user_id_idx on resume_views(user_id);

-- Vector search function
create or replace function match_resume_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float,
  match_count int
)
returns table(content text, similarity float)
language sql stable
as $$
  select content, 1 - (embedding <=> query_embedding) as similarity
  from resume_chunks
  where user_id = match_user_id
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- Row Level Security
alter table profiles enable row level security;
alter table resumes enable row level security;
alter table project_links enable row level security;
alter table resume_chunks enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table resume_views enable row level security;

-- Candidates can read/write their own profile; profiles are publicly readable by username
drop policy if exists "profiles_public_select" on profiles;
create policy "profiles_public_select" on profiles for select using (true);

drop policy if exists "profiles_owner_upsert" on profiles;
create policy "profiles_owner_upsert" on profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_owner_update" on profiles;
create policy "profiles_owner_update" on profiles for update using (auth.uid() = id);

-- Resumes: owners can manage, public can read active resume content
drop policy if exists "resumes_owner_all" on resumes;
create policy "resumes_owner_all" on resumes for all using (auth.uid() = user_id);

drop policy if exists "resumes_public_read_active" on resumes;
create policy "resumes_public_read_active" on resumes for select using (is_active = true);

-- Project links
drop policy if exists "project_links_owner_all" on project_links;
create policy "project_links_owner_all" on project_links for all using (auth.uid() = user_id);

drop policy if exists "project_links_public_read" on project_links;
create policy "project_links_public_read" on project_links for select using (true);

-- Chat sessions/messages handled via service role on server
drop policy if exists "chat_sessions_owner_read" on chat_sessions;
create policy "chat_sessions_owner_read" on chat_sessions for select using (auth.uid() = user_id);

drop policy if exists "chat_messages_owner_read" on chat_messages;
create policy "chat_messages_owner_read" on chat_messages for select using (
  exists (select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- Analytics
drop policy if exists "resume_views_owner_read" on resume_views;
create policy "resume_views_owner_read" on resume_views for select using (auth.uid() = user_id);

-- Storage bucket for resume files (create manually or via API)
-- insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false)
--   on conflict (id) do nothing;
