-- Notification preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  inapp_interview boolean NOT NULL DEFAULT true,
  inapp_application boolean NOT NULL DEFAULT true,
  inapp_job_match boolean NOT NULL DEFAULT true,
  inapp_profile boolean NOT NULL DEFAULT true,
  inapp_offer boolean NOT NULL DEFAULT true,
  email_interview boolean NOT NULL DEFAULT true,
  email_application boolean NOT NULL DEFAULT true,
  email_job_match boolean NOT NULL DEFAULT false,
  email_profile boolean NOT NULL DEFAULT false,
  email_offer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
ON public.notification_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: insert a notification honouring in-app preferences
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _type text, _title text, _body text, _link text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _allowed boolean := true;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  SELECT CASE _type
    WHEN 'interview' THEN p.inapp_interview
    WHEN 'application' THEN p.inapp_application
    WHEN 'job_match' THEN p.inapp_job_match
    WHEN 'profile' THEN p.inapp_profile
    WHEN 'offer' THEN p.inapp_offer
    ELSE true END
  INTO _allowed
  FROM public.notification_preferences p WHERE p.user_id = _user_id;

  IF _allowed IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_user_id, _type, _title, _body, _link);
  END IF;
END; $$;

-- Interview scheduled
CREATE OR REPLACE FUNCTION public.on_interview_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _teacher uuid; _title text;
BEGIN
  SELECT a.teacher_id, j.title INTO _teacher, _title
  FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  PERFORM public.notify_user(
    _teacher, 'interview', 'Interview scheduled',
    'Your interview for ' || coalesce(_title, 'a role') || ' is set for ' || to_char(NEW.scheduled_at, 'DD Mon YYYY, HH24:MI') || '.',
    '/teacher/applications');
  RETURN NEW;
END; $$;

CREATE TRIGGER interviews_notify_scheduled
AFTER INSERT ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.on_interview_scheduled();

-- Application status changes
CREATE OR REPLACE FUNCTION public.on_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _title text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT j.title INTO _title FROM public.jobs j WHERE j.id = NEW.job_id;

  IF NEW.status = 'offer' THEN
    PERFORM public.notify_user(NEW.teacher_id, 'offer', 'Offer received',
      'You have received an offer for ' || coalesce(_title, 'a role') || '.', '/teacher/applications');
  ELSIF NEW.status = 'rejected' THEN
    PERFORM public.notify_user(NEW.teacher_id, 'application', 'Application not successful',
      'Your application for ' || coalesce(_title, 'a role') || ' was not taken forward.', '/teacher/applications');
  ELSIF NEW.status IN ('shortlisted', 'interview_scheduled', 'demo_class', 'school_review', 'hired', 'joined') THEN
    PERFORM public.notify_user(NEW.teacher_id, 'application', 'Application accepted',
      'Your application for ' || coalesce(_title, 'a role') || ' moved to ' || replace(NEW.status::text, '_', ' ') || '.', '/teacher/applications');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER applications_notify_status
AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.on_application_status_change();

-- New job matches for available teachers by subject
CREATE OR REPLACE FUNCTION public.on_job_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _t record;
BEGIN
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;

  FOR _t IN
    SELECT tp.user_id FROM public.teacher_profiles tp
    WHERE tp.available = true
      AND NEW.subject IS NOT NULL
      AND tp.subjects && ARRAY[NEW.subject]
    LIMIT 200
  LOOP
    PERFORM public.notify_user(_t.user_id, 'job_match', 'New job match',
      NEW.title || ' matches your subjects.', '/teacher/jobs');
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER jobs_notify_match
AFTER INSERT OR UPDATE OF status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.on_job_published();