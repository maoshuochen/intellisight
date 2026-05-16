drop policy if exists "members can read projects" on public.projects;
drop policy if exists "editors can update projects" on public.projects;
drop policy if exists "owners can delete projects" on public.projects;
drop policy if exists "members can read memberships" on public.project_members;
drop policy if exists "owners can manage memberships" on public.project_members;
drop policy if exists "members can read own memberships" on public.project_members;
drop policy if exists "owners can read project memberships" on public.project_members;
drop policy if exists "owners can insert memberships" on public.project_members;
drop policy if exists "owners can update memberships" on public.project_members;
drop policy if exists "owners can delete memberships" on public.project_members;

create policy "members can read projects"
on public.projects
for select
to authenticated
using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = (select auth.uid())
  )
);

create policy "editors can update projects"
on public.projects
for update
to authenticated
using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = (select auth.uid())
      and pm.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = (select auth.uid())
      and pm.role in ('owner', 'editor')
  )
);

create policy "owners can delete projects"
on public.projects
for delete
to authenticated
using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = (select auth.uid())
      and pm.role = 'owner'
  )
);

create policy "members can read own memberships"
on public.project_members
for select
to authenticated
using (user_id = (select auth.uid()));
