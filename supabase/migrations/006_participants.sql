create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  display_name text not null,
  role text,
  sample_group text,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, display_name)
);

alter table public.interviews
  add column if not exists participant_id uuid references public.participants(id) on delete set null;

drop trigger if exists touch_participants_updated_at on public.participants;
create trigger touch_participants_updated_at before update on public.participants for each row execute function public.touch_updated_at();

create index if not exists idx_participants_project_name on public.participants(project_id, lower(display_name));
create index if not exists idx_participants_project_group on public.participants(project_id, sample_group);
create index if not exists idx_interviews_participant on public.interviews(participant_id);

alter table public.participants enable row level security;

create policy "members read participants" on public.participants for select using (public.is_project_member(project_id));
create policy "editors write participants" on public.participants for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

grant select, insert, update, delete on table public.participants to authenticated;

insert into public.participants (project_id, display_name)
select distinct project_id, trim(participant_name)
from public.interviews
where participant_name is not null and trim(participant_name) <> ''
on conflict (project_id, display_name) do nothing;

update public.interviews i
set participant_id = p.id
from public.participants p
where i.participant_id is null
  and i.project_id = p.project_id
  and i.participant_name is not null
  and lower(trim(i.participant_name)) = lower(p.display_name);
