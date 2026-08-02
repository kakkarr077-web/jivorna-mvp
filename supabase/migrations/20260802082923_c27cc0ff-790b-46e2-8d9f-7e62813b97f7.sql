-- ============ ENUMS ============
create type public.teacher_status as enum ('draft','active','placed','inactive');
create type public.subscription_status as enum ('trial','active','past_due','cancelled');
create type public.interview_mode as enum ('in_person','video','phone');
create type public.interview_status as enum ('scheduled','completed','cancelled','no_show');
create type public.document_type as enum ('resume','certificate','id_proof','photo','video','other');
create type public.invoice_status as enum ('draft','sent','paid','overdue','void');

-- ============ TEACHERS (teacher_profiles) ============
alter table public.teacher_profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists current_school text,
  add column if not exists qualification text,
  add column if not exists grades text[] not null default '{}',
  add column if not exists expected_salary numeric,
  add column if not exists current_salary numeric,
  add column if not exists notice_period_days integer,
  add column if not exists languages text[] not null default '{}',
  add column if not exists resume_url text,
  add column if not exists profile_photo_url text,
  add column if not exists video_demo_url text,
  add column if not exists available_from date,
  add column if not exists status public.teacher_status not null default 'draft';

-- ============ SCHOOLS ============
alter table public.schools
  add column if not exists board text,
  add column if not exists principal_name text,
  add column if not exists hr_name text,
  add column if not exists contact_email text,
  add column if not exists phone text,
  add column if not exists student_count integer,
  add column if not exists school_type text,
  add column if not exists subscription_status public.subscription_status not null default 'trial';

-- ============ JOBS ============
alter table public.jobs
  add column if not exists grade text,
  add column if not exists min_experience_years integer not null default 0,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists openings integer not null default 1;

-- ============ INTERVIEWS ============
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  mode public.interview_mode not null default 'video',
  location text,
  meeting_url text,
  interviewer_name text,
  notes text,
  outcome text,
  status public.interview_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.interviews to authenticated;
grant all on public.interviews to service_role;
alter table public.interviews enable row level security;

create policy "Admins manage interviews" on public.interviews for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Teachers view own interviews" on public.interviews for select to authenticated
  using (exists (select 1 from public.applications a where a.id = interviews.application_id and a.teacher_id = auth.uid()));
create policy "Schools manage interviews for own jobs" on public.interviews for all to authenticated
  using (exists (select 1 from public.applications a join public.jobs j on j.id = a.job_id
                 join public.schools s on s.id = j.school_id
                 where a.id = interviews.application_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.applications a join public.jobs j on j.id = a.job_id
                 join public.schools s on s.id = j.school_id
                 where a.id = interviews.application_id and s.owner_id = auth.uid()));

-- ============ DOCUMENTS ============
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  doc_type public.document_type not null default 'other',
  name text not null,
  file_url text not null,
  file_size_bytes bigint,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;

create policy "Owners manage own documents" on public.documents for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admins manage documents" on public.documents for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "Users read own notifications" on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own notifications" on public.notifications for delete to authenticated
  using (auth.uid() = user_id);
create policy "Admins manage notifications" on public.notifications for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ INVOICES ============
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  invoice_number text not null unique,
  description text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status public.invoice_status not null default 'draft',
  issued_on date not null default current_date,
  due_on date,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;

create policy "Admins manage invoices" on public.invoices for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Schools read own invoices" on public.invoices for select to authenticated
  using (exists (select 1 from public.schools s where s.id = invoices.school_id and s.owner_id = auth.uid()));

-- ============ TRIGGERS ============
create trigger interviews_set_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- helpful indexes
create index on public.interviews (application_id);
create index on public.documents (owner_id);
create index on public.notifications (user_id, read);
create index on public.invoices (school_id);