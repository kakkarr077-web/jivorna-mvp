ALTER TABLE public.jobs ALTER COLUMN status SET DEFAULT 'draft'::job_status;

DROP POLICY IF EXISTS "School owners manage own jobs" ON public.jobs;

CREATE POLICY "School owners insert own jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  AND status <> 'published'::job_status
);

CREATE POLICY "School owners update own jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
);

CREATE POLICY "School owners delete own jobs"
ON public.jobs FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.enforce_job_publish_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'published'::job_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published'::job_status)
  THEN
    RAISE EXCEPTION 'Only an administrator can publish a vacancy';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_job_publish_is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_job_publish_is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_job_publish_is_admin() FROM authenticated;

DROP TRIGGER IF EXISTS enforce_job_publish_is_admin ON public.jobs;
CREATE TRIGGER enforce_job_publish_is_admin
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_publish_is_admin();