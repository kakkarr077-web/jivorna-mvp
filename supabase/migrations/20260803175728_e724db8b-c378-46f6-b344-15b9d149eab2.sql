CREATE TABLE public.school_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_notes TO authenticated;
GRANT ALL ON public.school_notes TO service_role;

ALTER TABLE public.school_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read school notes" ON public.school_notes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create school notes" ON public.school_notes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND author_id = auth.uid());
CREATE POLICY "Admins can update school notes" ON public.school_notes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete school notes" ON public.school_notes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX school_notes_school_id_idx ON public.school_notes(school_id);

CREATE TRIGGER update_school_notes_updated_at
  BEFORE UPDATE ON public.school_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();