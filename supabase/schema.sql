-- ═══════════════════════════════════════════════════
-- UK DOCS — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════

-- PROFILES table (extends Supabase auth.users)
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null default '',
  name_ru     text not null default '',
  dob         date,
  nationality text default 'Ukrainian',
  avatar      text default '👤',
  created_at  timestamptz default now()
);

-- DOCUMENTS table
create table public.documents (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  category    text not null default 'other',
  title       text not null,
  title_ru    text default '',
  number      text default '',
  valid_from  date,
  valid_until date,
  notes       text default '',
  notes_ru    text default '',
  pinned      boolean default false,
  created_at  timestamptz default now()
);

-- PASSPORTS table
create table public.passports (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  type         text not null default 'Ukrainian Passport',
  number       text not null,
  issued_by    text default '',
  issued_date  date,
  expiry_date  date,
  notes        text default '',
  created_at   timestamptz default now()
);

-- PASSPORT PHOTOS table
create table public.passport_photos (
  id          uuid default gen_random_uuid() primary key,
  passport_id uuid references public.passports on delete cascade not null,
  user_id     uuid references auth.users on delete cascade not null,
  label       text default 'Page',
  data_url    text not null,
  added_at    timestamptz default now()
);

-- TODOS table
create table public.todos (
  id       uuid default gen_random_uuid() primary key,
  user_id  uuid references auth.users on delete cascade not null,
  todo_key text not null,
  done     boolean default false,
  unique(user_id, todo_key)
);

-- ═══════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Users can ONLY see their own data
-- ═══════════════════════════════════

alter table public.profiles       enable row level security;
alter table public.documents      enable row level security;
alter table public.passports      enable row level security;
alter table public.passport_photos enable row level security;
alter table public.todos          enable row level security;

-- Profiles policies
create policy "Users see own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Documents policies
create policy "Users see own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Passports policies
create policy "Users see own passports"
  on public.passports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Passport photos policies
create policy "Users see own passport photos"
  on public.passport_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Todos policies
create policy "Users see own todos"
  on public.todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════
-- Auto-create profile on signup
-- ═══════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
