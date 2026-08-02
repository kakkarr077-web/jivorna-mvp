REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_interview_scheduled() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_application_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_job_published() FROM anon, authenticated;