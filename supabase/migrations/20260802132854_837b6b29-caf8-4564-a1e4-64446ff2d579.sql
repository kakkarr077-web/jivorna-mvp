ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS boards text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.saved_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_type text NOT NULL DEFAULT 'bookmark' CHECK (list_type IN ('bookmark','shortlist')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_owner_id, teacher_id, list_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_teachers TO authenticated;
GRANT ALL ON public.saved_teachers TO service_role;

ALTER TABLE public.saved_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools manage own saved teachers"
ON public.saved_teachers FOR ALL TO authenticated
USING (auth.uid() = school_owner_id)
WITH CHECK (auth.uid() = school_owner_id);

CREATE POLICY "Admins manage saved teachers"
ON public.saved_teachers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER saved_teachers_set_updated_at
BEFORE UPDATE ON public.saved_teachers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();