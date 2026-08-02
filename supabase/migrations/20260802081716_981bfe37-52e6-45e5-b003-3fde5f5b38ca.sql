
create type public.app_role as enum ('teacher','school','admin');
create type public.job_status as enum ('draft','published','closed');
create type public.application_status as enum ('submitted','reviewing','shortlisted','rejected','hired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create table public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  headline text,
  bio text,
  subjects text[] not null default '{}',
  experience_years int not null default 0,
  location text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.teacher_profiles to authenticated;
grant all on public.teacher_profiles to service_role;
alter table public.teacher_profiles enable row level security;
create policy "Teachers manage own teacher profile" on public.teacher_profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Schools and admins view teacher profiles" on public.teacher_profiles for select to authenticated using (public.has_role(auth.uid(),'school') or public.has_role(auth.uid(),'admin'));

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text,
  website text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.schools to anon;
grant select, insert, update, delete on public.schools to authenticated;
grant all on public.schools to service_role;
alter table public.schools enable row level security;
create policy "Anyone can view schools" on public.schools for select to anon, authenticated using (true);
create policy "Owners manage own school" on public.schools for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admins manage schools" on public.schools for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  subject text,
  location text,
  employment_type text not null default 'Full-time',
  salary_range text,
  description text,
  status public.job_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.jobs to anon;
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "Anyone can view published jobs" on public.jobs for select to anon, authenticated using (status = 'published');
create policy "School owners view own jobs" on public.jobs for select to authenticated using (exists (select 1 from public.schools s where s.id = jobs.school_id and s.owner_id = auth.uid()));
create policy "School owners manage own jobs" on public.jobs for all to authenticated using (exists (select 1 from public.schools s where s.id = jobs.school_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.schools s where s.id = jobs.school_id and s.owner_id = auth.uid()));
create policy "Admins manage jobs" on public.jobs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  cover_letter text,
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, teacher_id)
);
grant select, insert, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "Teachers manage own applications" on public.applications for all to authenticated using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy "Schools view applications to own jobs" on public.applications for select to authenticated using (exists (select 1 from public.jobs j join public.schools s on s.id = j.school_id where j.id = applications.job_id and s.owner_id = auth.uid()));
create policy "Schools update applications to own jobs" on public.applications for update to authenticated using (exists (select 1 from public.jobs j join public.schools s on s.id = j.school_id where j.id = applications.job_id and s.owner_id = auth.uid())) with check (true);
create policy "Admins manage applications" on public.applications for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger t_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_teacher_profiles_updated before update on public.teacher_profiles for each row execute function public.set_updated_at();
create trigger t_schools_updated before update on public.schools for each row execute function public.set_updated_at();
create trigger t_jobs_updated before update on public.jobs for each row execute function public.set_updated_at();
create trigger t_applications_updated before update on public.applications for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare _role public.app_role;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  _role := case lower(coalesce(new.raw_user_meta_data->>'role',''))
    when 'school' then 'school'::public.app_role
    when 'admin' then 'teacher'::public.app_role
    else 'teacher'::public.app_role end;

  insert into public.user_roles (user_id, role) values (new.id, _role) on conflict do nothing;

  if _role = 'teacher' then
    insert into public.teacher_profiles (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
