DROP VIEW IF EXISTS public.teacher_directory;

CREATE OR REPLACE FUNCTION public.teacher_directory()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  headline text,
  city text,
  state text,
  qualification text,
  subjects text[],
  grades text[],
  boards text[],
  languages text[],
  experience_years integer,
  expected_salary numeric,
  current_salary numeric,
  notice_period_days integer,
  available boolean,
  available_from date,
  profile_photo_url text,
  status teacher_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tp.user_id, tp.full_name, tp.headline, tp.city, tp.state, tp.qualification,
         tp.subjects, tp.grades, tp.boards, tp.languages, tp.experience_years,
         tp.expected_salary, tp.current_salary, tp.notice_period_days,
         tp.available, tp.available_from, tp.profile_photo_url, tp.status
  FROM public.teacher_profiles tp
  WHERE tp.status <> 'draft'::teacher_status
    AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'school'::app_role))
$$;

REVOKE ALL ON FUNCTION public.teacher_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_directory() TO authenticated, service_role;