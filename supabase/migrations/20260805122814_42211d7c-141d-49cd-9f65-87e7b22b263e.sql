-- 1. Schools: split the permissive anon+authenticated SELECT policy.
DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;

CREATE POLICY "Public can view school directory"
  ON public.schools FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated users can view schools"
  ON public.schools FOR SELECT TO authenticated
  USING (true);

-- Re-assert the safe public column subset for anonymous visitors.
REVOKE SELECT ON public.schools FROM anon;
GRANT SELECT (id, name, city, website, description, board, student_count, school_type, logo_url, brand_color, tagline)
  ON public.schools TO anon;

-- 2. user_roles: block privilege escalation to admin/recruiter.
CREATE OR REPLACE FUNCTION public.guard_privileged_role_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('admin'::public.app_role, 'recruiter'::public.app_role) THEN
    IF public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;
    -- One-time owner bootstrap: allowed only while no admin exists at all.
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only an administrator can grant the % role', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_privileged_role_grant ON public.user_roles;
CREATE TRIGGER guard_privileged_role_grant
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_role_grant();

REVOKE EXECUTE ON FUNCTION public.guard_privileged_role_grant() FROM PUBLIC, anon, authenticated;