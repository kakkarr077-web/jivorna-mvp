CREATE POLICY "Participants read application files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'application-attachments'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.schools s ON s.id = j.school_id
      WHERE a.id::text = (storage.foldername(name))[1]
        AND (s.owner_id = auth.uid() OR a.teacher_id = auth.uid())
    )
  )
);

CREATE POLICY "Participants upload application files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'application-attachments'
  AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.schools s ON s.id = j.school_id
    WHERE a.id::text = (storage.foldername(name))[1]
      AND (s.owner_id = auth.uid() OR a.teacher_id = auth.uid())
  )
);

CREATE POLICY "Participants delete application files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'application-attachments'
  AND owner = auth.uid()
);