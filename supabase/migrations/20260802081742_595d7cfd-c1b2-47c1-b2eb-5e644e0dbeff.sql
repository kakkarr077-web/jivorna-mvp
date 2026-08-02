
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;

drop policy "Schools update applications to own jobs" on public.applications;
create policy "Schools update applications to own jobs" on public.applications
  for update to authenticated
  using (exists (select 1 from public.jobs j join public.schools s on s.id = j.school_id where j.id = applications.job_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.jobs j join public.schools s on s.id = j.school_id where j.id = applications.job_id and s.owner_id = auth.uid()));
