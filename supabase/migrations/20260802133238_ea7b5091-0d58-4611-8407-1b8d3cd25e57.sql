ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'screening';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'interview_scheduled';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'demo_class';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'school_review';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'offer';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'joined';

CREATE TABLE IF NOT EXISTS public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'note',
  from_status text,
  to_status text,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_attachments TO authenticated;
GRANT ALL ON public.application_events TO service_role;
GRANT ALL ON public.application_comments TO service_role;
GRANT ALL ON public.application_attachments TO service_role;

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_attachments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_application_school(_application_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN schools s ON s.id = j.school_id
    WHERE a.id = _application_id AND s.owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_application_teacher(_application_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.id = _application_id AND a.teacher_id = _user_id
  )
$$;

-- events
CREATE POLICY "Admins manage application events" ON public.application_events
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants read application events" ON public.application_events
FOR SELECT TO authenticated
USING (public.owns_application_school(application_id, auth.uid()) OR public.is_application_teacher(application_id, auth.uid()));

CREATE POLICY "School owners write application events" ON public.application_events
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid() AND public.owns_application_school(application_id, auth.uid()));

-- comments
CREATE POLICY "Admins manage application comments" ON public.application_comments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read application comments" ON public.application_comments
FOR SELECT TO authenticated
USING (
  public.owns_application_school(application_id, auth.uid())
  OR (internal = false AND public.is_application_teacher(application_id, auth.uid()))
);

CREATE POLICY "Participants add application comments" ON public.application_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (public.owns_application_school(application_id, auth.uid()) OR public.is_application_teacher(application_id, auth.uid()))
);

CREATE POLICY "Authors update own comments" ON public.application_comments
FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors delete own comments" ON public.application_comments
FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- attachments
CREATE POLICY "Admins manage application attachments" ON public.application_attachments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants read application attachments" ON public.application_attachments
FOR SELECT TO authenticated
USING (public.owns_application_school(application_id, auth.uid()) OR public.is_application_teacher(application_id, auth.uid()));

CREATE POLICY "Participants add application attachments" ON public.application_attachments
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (public.owns_application_school(application_id, auth.uid()) OR public.is_application_teacher(application_id, auth.uid()))
);

CREATE POLICY "Uploaders delete own attachments" ON public.application_attachments
FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());

CREATE TRIGGER application_events_set_updated_at BEFORE UPDATE ON public.application_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER application_comments_set_updated_at BEFORE UPDATE ON public.application_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER application_attachments_set_updated_at BEFORE UPDATE ON public.application_attachments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();