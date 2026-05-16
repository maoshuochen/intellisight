create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.project_role as enum ('owner', 'editor', 'viewer');

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role public.project_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.outlines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outline_questions (
  id uuid primary key default gen_random_uuid(),
  outline_id uuid not null references public.outlines(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  content text not null,
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sample text,
  owner text,
  length text,
  participant_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paragraphs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  text text not null,
  speaker text,
  start_time text,
  end_time text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.code_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  color text not null default 'blue',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists public.codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code_group_id uuid not null references public.code_groups(id) on delete restrict,
  name text not null,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  paragraph_id uuid not null references public.paragraphs(id) on delete cascade,
  text text not null,
  start_offset integer not null default 0,
  end_offset integer not null default 0,
  comment text,
  legacy_highlight jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_offset >= start_offset)
);

create table if not exists public.annotation_codes (
  annotation_id uuid not null references public.annotations(id) on delete cascade,
  code_id uuid not null references public.codes(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (annotation_id, code_id)
);

create table if not exists public.interview_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  content text not null,
  timestamp text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  viewport jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  feature text not null,
  provider text not null,
  model text,
  input_hash text not null,
  result jsonb not null,
  accepted boolean,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger touch_projects_updated_at before update on public.projects for each row execute function public.touch_updated_at();
create trigger touch_outlines_updated_at before update on public.outlines for each row execute function public.touch_updated_at();
create trigger touch_outline_questions_updated_at before update on public.outline_questions for each row execute function public.touch_updated_at();
create trigger touch_interviews_updated_at before update on public.interviews for each row execute function public.touch_updated_at();
create trigger touch_paragraphs_updated_at before update on public.paragraphs for each row execute function public.touch_updated_at();
create trigger touch_code_groups_updated_at before update on public.code_groups for each row execute function public.touch_updated_at();
create trigger touch_codes_updated_at before update on public.codes for each row execute function public.touch_updated_at();
create trigger touch_annotations_updated_at before update on public.annotations for each row execute function public.touch_updated_at();
create trigger touch_interview_notes_updated_at before update on public.interview_notes for each row execute function public.touch_updated_at();
create trigger touch_canvases_updated_at before update on public.canvases for each row execute function public.touch_updated_at();
create trigger touch_reports_updated_at before update on public.reports for each row execute function public.touch_updated_at();

create index if not exists idx_project_members_user on public.project_members(user_id, project_id);
create index if not exists idx_outlines_project on public.outlines(project_id);
create index if not exists idx_outline_questions_outline_sort on public.outline_questions(outline_id, sort_order);
create index if not exists idx_interviews_project_created on public.interviews(project_id, created_at desc);
create index if not exists idx_paragraphs_interview_sort on public.paragraphs(interview_id, sort_order);
create index if not exists idx_annotations_project_created on public.annotations(project_id, created_at desc);
create index if not exists idx_annotations_paragraph on public.annotations(paragraph_id);
create index if not exists idx_annotation_codes_code on public.annotation_codes(code_id);
create index if not exists idx_codes_project_group on public.codes(project_id, code_group_id);
create index if not exists idx_canvases_project_updated on public.canvases(project_id, updated_at desc);
create index if not exists idx_ai_suggestions_project_feature on public.ai_suggestions(project_id, feature, created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.outlines enable row level security;
alter table public.outline_questions enable row level security;
alter table public.interviews enable row level security;
alter table public.paragraphs enable row level security;
alter table public.code_groups enable row level security;
alter table public.codes enable row level security;
alter table public.annotations enable row level security;
alter table public.annotation_codes enable row level security;
alter table public.interview_notes enable row level security;
alter table public.canvases enable row level security;
alter table public.reports enable row level security;
alter table public.ai_suggestions enable row level security;

create policy "profiles are readable by self" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles are editable by self" on public.profiles for update using (auth.uid() = user_id);

create policy "members can read projects" on public.projects for select using (public.is_project_member(id));
create policy "authenticated users can create projects" on public.projects for insert with check (auth.uid() = created_by);
create policy "editors can update projects" on public.projects for update using (public.can_edit_project(id));
create policy "owners can delete projects" on public.projects for delete using (
  exists (select 1 from public.project_members where project_id = id and user_id = auth.uid() and role = 'owner')
);

create policy "members can read memberships" on public.project_members for select using (public.is_project_member(project_id));
create policy "owners can manage memberships" on public.project_members for all using (
  exists (select 1 from public.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid() and pm.role = 'owner')
);

create policy "members read outlines" on public.outlines for select using (public.is_project_member(project_id));
create policy "editors write outlines" on public.outlines for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "members read outline questions" on public.outline_questions for select using (public.is_project_member(project_id));
create policy "editors write outline questions" on public.outline_questions for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "members read interviews" on public.interviews for select using (public.is_project_member(project_id));
create policy "editors write interviews" on public.interviews for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "members read paragraphs" on public.paragraphs for select using (public.is_project_member(project_id));
create policy "editors write paragraphs" on public.paragraphs for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "members read code groups" on public.code_groups for select using (public.is_project_member(project_id));
create policy "editors write code groups" on public.code_groups for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "members read codes" on public.codes for select using (public.is_project_member(project_id));
create policy "editors write codes" on public.codes for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "members read annotations" on public.annotations for select using (public.is_project_member(project_id));
create policy "editors write annotations" on public.annotations for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "members read annotation codes" on public.annotation_codes for select using (public.is_project_member(project_id));
create policy "editors write annotation codes" on public.annotation_codes for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "members read notes" on public.interview_notes for select using (public.is_project_member(project_id));
create policy "editors write notes" on public.interview_notes for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "members read canvases" on public.canvases for select using (public.is_project_member(project_id));
create policy "editors write canvases" on public.canvases for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "members read reports" on public.reports for select using (public.is_project_member(project_id));
create policy "editors write reports" on public.reports for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "members read ai suggestions" on public.ai_suggestions for select using (public.is_project_member(project_id));
create policy "editors write ai suggestions" on public.ai_suggestions for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
