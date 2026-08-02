-- Teachers manage files in their own folder (first path segment = user id)
CREATE POLICY "Users manage own teacher documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'teacher-documents' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'teacher-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Schools and admins may read teacher documents
CREATE POLICY "Schools and admins read teacher documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'teacher-documents'
  AND (public.has_role(auth.uid(), 'school'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);
