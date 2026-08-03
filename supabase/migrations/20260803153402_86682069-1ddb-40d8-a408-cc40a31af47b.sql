-- Extend interview status with a teacher-confirmed state
ALTER TYPE public.interview_status ADD VALUE IF NOT EXISTS 'confirmed';

-- Helper: owner of the school behind an application/job
CREATE OR REPLACE FUNCTION public.school_owner_for_job(_job_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.owner_id FROM public.jobs j JOIN public.schools s ON s.id = j.school_id WHERE j.id = _job_id;
$$;

REVOKE ALL ON FUNCTION public.school_owner_for_job(uuid) FROM PUBLIC, anon, authenticated;

-- Application received -> notify school owner
CREATE OR REPLACE FUNCTION public.on_application_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _owner uuid; _title text; _teacher text;
BEGIN
  SELECT j.title INTO _title FROM public.jobs j WHERE j.id = NEW.job_id;
  _owner := public.school_owner_for_job(NEW.job_id);
  SELECT coalesce(p.full_name, 'A teacher') INTO _teacher FROM public.profiles p WHERE p.id = NEW.teacher_id;

  PERFORM public.notify_user(_owner, 'application', 'Application received',
    coalesce(_teacher, 'A teacher') || ' applied for ' || coalesce(_title, 'one of your roles') || '.',
    '/school/applications');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS applications_notify_received ON public.applications;
CREATE TRIGGER applications_notify_received
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.on_application_received();

-- Application viewed -> notify teacher (added to the existing status-change trigger fn)
CREATE OR REPLACE FUNCTION public.on_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  ELSIF NEW.status IN ('reviewing', 'screening') AND OLD.status = 'submitted' THEN
    PERFORM public.notify_user(NEW.teacher_id, 'application', 'Application viewed',
      'A school has opened your application for ' || coalesce(_title, 'a role') || '.', '/teacher/applications');
  ELSIF NEW.status IN ('shortlisted', 'interview_scheduled', 'demo_class', 'school_review', 'hired', 'joined') THEN
    PERFORM public.notify_user(NEW.teacher_id, 'application', 'Application accepted',
      'Your application for ' || coalesce(_title, 'a role') || ' moved to ' || replace(NEW.status::text, '_', ' ') || '.', '/teacher/applications');
  END IF;
  RETURN NEW;
END; $$;

-- Interview accepted -> notify school owner
CREATE OR REPLACE FUNCTION public.on_interview_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _owner uuid; _title text; _teacher text; _job uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status <> 'confirmed' THEN RETURN NEW; END IF;

  SELECT a.job_id, j.title, coalesce(p.full_name, 'The teacher')
    INTO _job, _title, _teacher
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.profiles p ON p.id = a.teacher_id
  WHERE a.id = NEW.application_id;

  _owner := public.school_owner_for_job(_job);
  PERFORM public.notify_user(_owner, 'interview', 'Interview accepted',
    coalesce(_teacher, 'The teacher') || ' confirmed the interview for ' || coalesce(_title, 'a role') || '.',
    '/school/interviews');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS interviews_notify_confirmed ON public.interviews;
CREATE TRIGGER interviews_notify_confirmed
AFTER UPDATE OF status ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.on_interview_confirmed();

-- Job approved / sent back -> notify school owner
CREATE OR REPLACE FUNCTION public.on_job_review_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _owner uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT s.owner_id INTO _owner FROM public.schools s WHERE s.id = NEW.school_id;

  IF NEW.status = 'published' AND OLD.status IN ('pending_review', 'draft') THEN
    PERFORM public.notify_user(_owner, 'application', 'Job approved',
      NEW.title || ' has been approved and is now live.', '/school/jobs');
  ELSIF NEW.status = 'draft' AND OLD.status = 'pending_review' THEN
    PERFORM public.notify_user(_owner, 'application', 'Job sent back',
      NEW.title || ' was not approved and has been returned to drafts for changes.', '/school/jobs');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS jobs_notify_review_decision ON public.jobs;
CREATE TRIGGER jobs_notify_review_decision
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.on_job_review_decision();

REVOKE ALL ON FUNCTION public.on_application_received() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_interview_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_job_review_decision() FROM PUBLIC, anon, authenticated;
