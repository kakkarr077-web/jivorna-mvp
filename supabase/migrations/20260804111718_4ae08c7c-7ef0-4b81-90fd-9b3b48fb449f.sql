REVOKE EXECUTE ON FUNCTION public.activity_school_created() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activity_job_published() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activity_application_submitted() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activity_application_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activity_interview_scheduled() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activity_task_completed() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_communication(text, uuid, public.comm_channel, text, text) FROM PUBLIC;