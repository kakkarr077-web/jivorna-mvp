-- staff helper (admin or recruiter)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','recruiter'))
$$;

-- ============ new columns ============
ALTER TABLE public.schools           ADD COLUMN IF NOT EXISTS assigned_recruiter uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.jobs              ADD COLUMN IF NOT EXISTS assigned_recruiter uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.teacher_profiles  ADD COLUMN IF NOT EXISTS assigned_recruiter uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.applications      ADD COLUMN IF NOT EXISTS assigned_recruiter uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.applications      ADD COLUMN IF NOT EXISTS expected_salary numeric;
ALTER TABLE public.applications      ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.interviews        ADD COLUMN IF NOT EXISTS rating integer;
ALTER TABLE public.interviews        ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE public.interviews        ADD COLUMN IF NOT EXISTS result text;

-- staff may set the new admin-only columns
CREATE POLICY "Staff manage school assignment" ON public.schools FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage teacher assignment" ON public.teacher_profiles FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ enums ============
DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('low','medium','high','urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_status  AS ENUM ('todo','in_progress','blocked','done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.comm_channel AS ENUM ('call','email','meeting','whatsapp','note','status_change','interview','offer','system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.calendar_event_type AS ENUM ('call','meeting','follow_up','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ tasks ============
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_type text CHECK (related_type IN ('school','teacher','job','lead','application','interview')),
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX tasks_assigned_due_idx ON public.tasks (assigned_to, due_at);
CREATE INDEX tasks_related_idx ON public.tasks (related_type, related_id);

-- ============ communications ============
CREATE TABLE public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('school','teacher','job','lead','application','interview')),
  entity_id uuid NOT NULL,
  channel public.comm_channel NOT NULL DEFAULT 'note',
  summary text NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recruiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage communications" ON public.communications FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER communications_set_updated_at BEFORE UPDATE ON public.communications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX communications_entity_idx ON public.communications (entity_type, entity_id, occurred_at DESC);

-- ============ calendar events ============
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type public.calendar_event_type NOT NULL DEFAULT 'meeting',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_type text CHECK (related_type IN ('school','teacher','job','lead','application','interview')),
  related_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage calendar events" ON public.calendar_events FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER calendar_events_set_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX calendar_events_start_idx ON public.calendar_events (start_at);

-- ============ saved views ============
CREATE TABLE public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_views TO authenticated;
GRANT ALL ON public.saved_views TO service_role;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved views" ON public.saved_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER saved_views_set_updated_at BEFORE UPDATE ON public.saved_views FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ activity engine ============
CREATE OR REPLACE FUNCTION public.log_communication(_entity_type text, _entity_id uuid, _channel public.comm_channel, _summary text, _body text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.communications (entity_type, entity_id, channel, summary, body, recruiter_id)
  VALUES (_entity_type, _entity_id, _channel, _summary, _body, auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.activity_school_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_communication('school', NEW.id, 'system', NEW.name || ' was registered on Jivorna.');
  RETURN NEW;
END; $$;
CREATE TRIGGER activity_school_created AFTER INSERT ON public.schools FOR EACH ROW EXECUTE FUNCTION public.activity_school_created();

CREATE OR REPLACE FUNCTION public.activity_job_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    PERFORM public.log_communication('job', NEW.id, 'system', NEW.title || ' was published.');
    PERFORM public.log_communication('school', NEW.school_id, 'system', 'Vacancy published: ' || NEW.title);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER activity_job_published AFTER INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.activity_job_published();

CREATE OR REPLACE FUNCTION public.activity_application_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  SELECT j.title INTO _title FROM public.jobs j WHERE j.id = NEW.job_id;
  PERFORM public.log_communication('application', NEW.id, 'system', 'Application submitted for ' || coalesce(_title, 'a vacancy') || '.');
  RETURN NEW;
END; $$;
CREATE TRIGGER activity_application_submitted AFTER INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.activity_application_submitted();

CREATE OR REPLACE FUNCTION public.activity_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_communication('application', NEW.id, 'status_change',
      'Stage changed from ' || replace(OLD.status::text,'_',' ') || ' to ' || replace(NEW.status::text,'_',' ') || '.');
    IF NEW.status IN ('offer','offer_accepted') THEN
      PERFORM public.log_communication('application', NEW.id, 'offer', 'Offer ' || CASE WHEN NEW.status = 'offer' THEN 'sent' ELSE 'accepted' END || '.');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER activity_application_status AFTER UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.activity_application_status();

CREATE OR REPLACE FUNCTION public.activity_interview_scheduled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_communication('interview', NEW.id, 'interview',
    'Interview scheduled for ' || to_char(NEW.scheduled_at, 'DD Mon YYYY, HH24:MI') || '.');
  PERFORM public.log_communication('application', NEW.application_id, 'interview',
    'Interview scheduled for ' || to_char(NEW.scheduled_at, 'DD Mon YYYY, HH24:MI') || '.');
  RETURN NEW;
END; $$;
CREATE TRIGGER activity_interview_scheduled AFTER INSERT ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.activity_interview_scheduled();

CREATE OR REPLACE FUNCTION public.activity_task_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    NEW.completed_at := coalesce(NEW.completed_at, now());
    IF NEW.related_type IS NOT NULL AND NEW.related_id IS NOT NULL THEN
      PERFORM public.log_communication(NEW.related_type, NEW.related_id, 'system', 'Task completed: ' || NEW.title);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER activity_task_completed BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.activity_task_completed();

REVOKE EXECUTE ON FUNCTION public.log_communication(text, uuid, public.comm_channel, text, text) FROM anon, authenticated;