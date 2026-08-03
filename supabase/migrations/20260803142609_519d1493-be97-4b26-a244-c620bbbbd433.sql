DROP POLICY IF EXISTS "Schools update applications to own jobs" ON public.applications;

CREATE POLICY "Schools update applications to own jobs"
ON public.applications
FOR UPDATE
TO authenticated
USING (public.owns_application_school(id, auth.uid()))
WITH CHECK (public.owns_application_school(id, auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_application_school_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() = OLD.teacher_id THEN
    RETURN NEW;
  END IF;

  IF NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
     OR NEW.cover_letter IS DISTINCT FROM OLD.cover_letter
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Schools may only update the status of an application';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_application_school_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_application_school_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_application_school_update() FROM authenticated;

DROP TRIGGER IF EXISTS enforce_application_school_update ON public.applications;
CREATE TRIGGER enforce_application_school_update
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_school_update();