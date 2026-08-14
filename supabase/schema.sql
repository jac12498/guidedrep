-- Exercise Coach — database schema & Row-Level Security.
-- Run this once in your Supabase project (SQL Editor → paste → Run).
-- Every table isolates data per user via RLS (user_id = auth.uid()), so one user
-- can never read or write another user's rows. The admin dashboard uses the
-- service-role key server-side, which bypasses RLS by design.

-- ---- profiles: one row per auth user ----
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Onboarding: name is display_name above; these record the safety-disclaimer agreement.
alter table public.profiles add column if not exists disclaimer_accepted_at timestamptz;
alter table public.profiles add column if not exists disclaimer_version text;

-- Fitness questionnaire answers (goal, experience, equipment, injuries, etc.).
-- Drives the personalized starter routines (Free) and the 12-week program (Pro).
alter table public.profiles add column if not exists fitness_profile jsonb;

-- Billing / Stripe subscription (nullable = Free plan). Updated by the Stripe
-- webhook via the service-role client. ai_generations_used meters the Free tier's
-- limited AI routine generations (Pro is unlimited).
alter table public.profiles add column if not exists stripe_customer_id   text;
alter table public.profiles add column if not exists subscription_status  text;
alter table public.profiles add column if not exists price_id             text;
alter table public.profiles add column if not exists current_period_end   timestamptz;
alter table public.profiles add column if not exists ai_generations_used  int not null default 0;
create index if not exists profiles_stripe_customer on public.profiles (stripe_customer_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- routines: user-created & AI-generated routines (seed/program are code-defined) ----
create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  focus       text,
  description text,
  source      text,
  exercises   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.routines enable row level security;

drop policy if exists "routines: own" on public.routines;
create policy "routines: own" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- session_logs: workout history ----
create table if not exists public.session_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  routine_id      text,
  routine_name    text,
  performed_at    timestamptz not null default now(),
  duration_sec    int,
  completed_count int,
  total_count     int
);
alter table public.session_logs enable row level security;

drop policy if exists "session_logs: own" on public.session_logs;
create policy "session_logs: own" on public.session_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists session_logs_user_time on public.session_logs (user_id, performed_at desc);

-- ---- program_state: 12-week program progress (one row per user) ----
create table if not exists public.program_state (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  completed  text[] not null default '{}',
  has_band   boolean not null default true,
  started_at timestamptz
);
alter table public.program_state enable row level security;

drop policy if exists "program_state: own" on public.program_state;
create policy "program_state: own" on public.program_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- program_blocks: a personalized 12-week program (Pro) ----
-- Each block is one generated 12-week plan (block_number increments as the user
-- finishes a block and builds the next). `plan` is the personalized phase sessions;
-- `source_answers` snapshots the questionnaire it was built from; `completed_days`
-- tracks progress within this block.
create table if not exists public.program_blocks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  block_number   int not null default 1,
  source_answers jsonb,
  plan           jsonb not null,
  completed_days text[] not null default '{}',
  status         text not null default 'active',
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);
-- Mid-block check-in (~week 3-4): { at, feedback, note, adjusted }. Non-null once handled.
alter table public.program_blocks add column if not exists midblock jsonb;
alter table public.program_blocks enable row level security;

drop policy if exists "program_blocks: own" on public.program_blocks;
create policy "program_blocks: own" on public.program_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists program_blocks_user on public.program_blocks (user_id, created_at desc);

-- ---- routine_feedback: optional end-of-workout rating + note (for review) ----
create table if not exists public.routine_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  routine_id   text,
  routine_name text,
  rating       text not null, -- too_easy | just_right | too_hard
  note         text,
  created_at   timestamptz not null default now()
);
alter table public.routine_feedback enable row level security;
drop policy if exists "routine_feedback: own" on public.routine_feedback;
create policy "routine_feedback: own" on public.routine_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists routine_feedback_user on public.routine_feedback (user_id, created_at desc);

-- ---- auto-create a profile row whenever a new auth user signs up ----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- make yourself an admin (run after your first sign-in) ----
-- update public.profiles set is_admin = true where email = 'jeffery.a.collins@gmail.com';
