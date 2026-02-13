-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Users & Orgs)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  organization_id uuid, -- Link to org
  role text default 'member', -- 'owner', 'admin', 'member'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. ORGANIZATIONS
create table organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- 3. SALES SCRIPTS (Playbooks)
create table scripts (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) not null,
  name text not null,
  description text,
  coach_personality text default 'Strategic',
  coach_tone text default 'Here is a tip',
  intervention_level text default 'Medium',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table script_steps (
  id uuid default uuid_generate_v4() primary key,
  script_id uuid references scripts(id) on delete cascade not null,
  step_order int not null,
  name text not null,
  description text,
  key_questions text[],
  transition_criteria text,
  estimated_duration int, -- seconds
  created_at timestamptz default now()
);

create table objections (
  id uuid default uuid_generate_v4() primary key,
  script_id uuid references scripts(id) on delete cascade not null,
  trigger_phrases text[] not null,
  mental_trigger text,
  suggested_response text,
  coaching_tip text,
  created_at timestamptz default now()
);

-- 4. CALLS (History)
create table calls (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  organization_id uuid references organizations(id),
  script_id uuid references scripts(id),
  platform text,
  status text default 'ACTIVE', -- 'ACTIVE', 'COMPLETED'
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int,
  transcript jsonb default '[]',
  lead_profile jsonb default '{}',
  summary jsonb,
  created_at timestamptz default now()
);

create table call_events (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references calls(id) on delete cascade not null,
  event_type text not null, -- 'TIP', 'OBJECTION', etc
  content text,
  metadata jsonb,
  timestamp timestamptz default now()
);

create table call_summaries (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references calls(id) on delete cascade unique not null,
  script_adherence_score int,
  strengths text[],
  improvements text[],
  objections_faced jsonb, -- [{ objection, handled, response }]
  buying_signals text[],
  lead_sentiment text,
  result text,
  next_steps text[],
  ai_notes text,
  created_at timestamptz default now()
);

-- Enable RLS (Row Level Security) - Basic Setup
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table scripts enable row level security;
alter table calls enable row level security;

-- Policies (Simplified for dev: authenticated users can do anything)
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

create policy "Authenticated users can view/edit organization data" on organizations for all using ( auth.role() = 'authenticated' );
create policy "Authenticated users can view/edit scripts" on scripts for all using ( auth.role() = 'authenticated' );
create policy "Authenticated users can view/edit calls" on calls for all using ( auth.role() = 'authenticated' );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
