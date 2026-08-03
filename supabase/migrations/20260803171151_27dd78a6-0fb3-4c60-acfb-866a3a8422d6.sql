-- 1) Restrict anonymous visitors to non-sensitive school columns only
REVOKE SELECT ON public.schools FROM anon;
GRANT SELECT (id, name, city, board, school_type, logo_url, brand_color, tagline, description, website, student_count) ON public.schools TO anon;

-- 2) platform_stats: SECURITY DEFINER function must not be callable by anonymous users
REVOKE EXECUTE ON FUNCTION public.platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_stats() TO authenticated, service_role;