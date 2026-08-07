CREATE OR REPLACE FUNCTION public.school_can_view_teacher(_school_owner uuid, _teacher_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.schools s ON s.id = j.school_id
    WHERE a.teacher_id = _teacher_id AND s.owner_id = _school_owner
  )
$$;

REVOKE ALL ON FUNCTION public.school_can_view_teacher(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_can_view_teacher(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Schools and admins view teacher profiles" ON public.teacher_profiles;

CREATE POLICY "Staff and related schools view teacher profiles"
ON public.teacher_profiles
FOR SELECT
TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    has_role(auth.uid(), 'school'::app_role)
    AND status <> 'draft'::teacher_status
    AND public.school_can_view_teacher(auth.uid(), user_id)
  )
);

-- Safe browsing directory for schools/staff: no email, phone, resume or video links.
CREATE OR REPLACE VIEW public.teacher_directory
WITH (security_invoker = false)
AS
SELECT
  tp.user_id,
  tp.full_name,
  tp.headline,
  tp.city,
  tp.state,
  tp.qualification,
  tp.subjects,
  tp.grades,
  tp.boards,
  tp.languages,
  tp.experience_years,
  tp.expected_salary,
  tp.current_salary,
  tp.notice_period_days,
  tp.available,
  tp.available_from,
  tp.profile_photo_url,
  tp.status
FROM public.teacher_profiles tp
WHERE tp.status <> 'draft'::teacher_status
  AND (public.is_staff(auth.uid()) OR has_role(auth.uid(), 'school'::app_role));

REVOKE ALL ON public.teacher_directory FROM PUBLIC, anon;
GRANT SELECT ON public.teacher_directory TO authenticated;

-- Storage: schools may only read documents of teachers who applied to their vacancies.
DROP POLICY IF EXISTS "Schools and admins read teacher documents" ON storage.objects;

CREATE POLICY "Staff and related schools read teacher documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-documents'
  AND (
    public.is_staff(auth.uid())
    OR (
      has_role(auth.uid(), 'school'::app_role)
      AND public.school_can_view_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);