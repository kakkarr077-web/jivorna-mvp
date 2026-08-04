REVOKE EXECUTE ON FUNCTION public.activity_school_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_job_published() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_application_submitted() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_application_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_interview_scheduled() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_task_completed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;