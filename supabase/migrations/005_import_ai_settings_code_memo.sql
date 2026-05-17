alter table public.codes add column if not exists definition text;

create table if not exists public.project_ai_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  enabled boolean not null default true,
  api_base text not null default 'https://api.openai.com/v1',
  api_key text,
  model text not null default 'gpt-4o-mini',
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_project_ai_settings_updated_at on public.project_ai_settings;
create trigger touch_project_ai_settings_updated_at
  before update on public.project_ai_settings
  for each row execute function public.touch_updated_at();

create index if not exists idx_project_ai_settings_project on public.project_ai_settings(project_id);

alter table public.project_ai_settings enable row level security;

drop policy if exists "members read project ai settings" on public.project_ai_settings;
drop policy if exists "editors write project ai settings" on public.project_ai_settings;

create policy "members read project ai settings" on public.project_ai_settings
  for select using (public.is_project_member(project_id));

create policy "editors write project ai settings" on public.project_ai_settings
  for all using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
