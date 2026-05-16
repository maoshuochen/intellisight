drop policy if exists "owners can read project memberships" on public.project_members;
drop policy if exists "owners can insert memberships" on public.project_members;
drop policy if exists "owners can update memberships" on public.project_members;
drop policy if exists "owners can delete memberships" on public.project_members;
drop policy if exists "owners can manage memberships" on public.project_members;

drop policy if exists "members can read own memberships" on public.project_members;

create policy "members can read own memberships"
on public.project_members
for select
to authenticated
using (user_id = (select auth.uid()));
