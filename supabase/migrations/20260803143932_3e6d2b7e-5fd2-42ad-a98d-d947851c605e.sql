-- Aggregate-only public counters for the marketing homepage.
-- SECURITY DEFINER so anonymous visitors get totals without gaining read
-- access to teacher_profiles rows (which hold contact details).
CREATE OR REPLACE FUNCTION public.platform_stats()
RETURNS TABLE (teacher_count bigint, school_count bigint, live_job_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.teacher_profiles WHERE status = 'active'),
    (SELECT count(*) FROM public.schools),
    (SELECT count(*) FROM public.jobs WHERE status = 'published')
$$;

REVOKE ALL ON FUNCTION public.platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_stats() TO anon, authenticated;