-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- EAs table (managed by Supabase Auth)
create table eas (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  created_at timestamptz default now()
);

-- Directors table
create table directors (
  id uuid default uuid_generate_v4() primary key,
  ea_id uuid references eas(id) on delete cascade not null,
  full_name text not null,
  email text,
  title text,
  company text,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now()
);

-- Bookings table
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  director_id uuid references directors(id) on delete cascade not null,
  type text not null check (type in ('flight','hotel','event','cab','restaurant')),
  date date not null,
  end_date date,
  status text default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  details jsonb not null default '{}',
  parsed_from_email boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Calendar events (synced from Google Calendar)
create table calendar_events (
  id uuid default uuid_generate_v4() primary key,
  director_id uuid references directors(id) on delete cascade not null,
  google_event_id text unique,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  description text,
  meeting_link text,
  attendees jsonb default '[]',
  synced_at timestamptz default now()
);

-- Projects table
create table projects (
  id uuid default uuid_generate_v4() primary key,
  director_id uuid references directors(id) on delete cascade not null,
  name text not null,
  status text default 'on_track' check (status in ('on_track','needs_attention','blocked','completed')),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project updates (status feed)
create table project_updates (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  note text not null,
  posted_by text not null,
  created_at timestamptz default now()
);

-- EA push messages to director
create table push_messages (
  id uuid default uuid_generate_v4() primary key,
  director_id uuid references directors(id) on delete cascade not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Google Calendar OAuth tokens per EA
create table calendar_tokens (
  id uuid default uuid_generate_v4() primary key,
  ea_id uuid references eas(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  expiry timestamptz not null,
  calendar_ids jsonb default '[]'
);

-- RLS Policies
alter table eas enable row level security;
alter table directors enable row level security;
alter table bookings enable row level security;
alter table calendar_events enable row level security;
alter table projects enable row level security;
alter table project_updates enable row level security;
alter table push_messages enable row level security;
alter table calendar_tokens enable row level security;

-- EA can only see their own data
create policy "EA owns directors" on directors
  for all using (ea_id = auth.uid());

create policy "EA owns bookings" on bookings
  for all using (
    director_id in (select id from directors where ea_id = auth.uid())
  );

create policy "EA owns calendar events" on calendar_events
  for all using (
    director_id in (select id from directors where ea_id = auth.uid())
  );

create policy "EA owns projects" on projects
  for all using (
    director_id in (select id from directors where ea_id = auth.uid())
  );

create policy "EA owns project updates" on project_updates
  for all using (
    project_id in (
      select p.id from projects p
      join directors d on d.id = p.director_id
      where d.ea_id = auth.uid()
    )
  );

create policy "EA owns push messages" on push_messages
  for all using (
    director_id in (select id from directors where ea_id = auth.uid())
  );

create policy "EA owns calendar tokens" on calendar_tokens
  for all using (ea_id = auth.uid());

-- Public read via share token (no auth needed for director view)
create policy "Public read via share token" on directors
  for select using (true);

create policy "Public read bookings via director" on bookings
  for select using (true);

create policy "Public read calendar events" on calendar_events
  for select using (true);

create policy "Public read projects" on projects
  for select using (true);

create policy "Public read project updates" on project_updates
  for select using (true);

create policy "Public read push messages" on push_messages
  for select using (true);
