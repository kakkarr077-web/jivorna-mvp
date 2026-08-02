-- 1. Fix application-attachments storage policies (use object path, not school name)
DROP POLICY IF EXISTS "Participants read application files" ON storage.objects;
DROP POLICY IF EXISTS "Participants upload application files" ON storage.objects;

CREATE POLICY "Participants read application files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'application-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.schools s ON s.id = j.school_id
      WHERE a.id::text = (storage.foldername(storage.objects.name))[1]
        AND (s.owner_id = auth.uid() OR a.teacher_id = auth.uid())
    )
  )
);

CREATE POLICY "Participants upload application files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'application-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.schools s ON s.id = j.school_id
    WHERE a.id::text = (storage.foldername(storage.objects.name))[1]
      AND (s.owner_id = auth.uid() OR a.teacher_id = auth.uid())
  )
);

-- 2. Hide draft teacher profiles from schools
DROP POLICY IF EXISTS "Schools and admins view teacher profiles" ON public.teacher_profiles;

CREATE POLICY "Schools and admins view teacher profiles"
ON public.teacher_profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'school'::public.app_role)
    AND status <> 'draft'::public.teacher_status
  )
);

-- 3. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_application_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_interview_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_job_published() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_application_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_application_school(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_application_teacher(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_application_school(uuid, uuid) TO authenticated, service_role;