CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','proposal','negotiation','won','lost');
CREATE TYPE public.lead_priority AS ENUM ('low','medium','high');

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  city text,
  board text,
  source text,
  status public.lead_status NOT NULL DEFAULT 'new',
  priority public.lead_priority NOT NULL DEFAULT 'medium',
  next_follow_up date,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  converted_school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX leads_status_idx ON public.leads (status);
CREATE INDEX leads_follow_up_idx ON public.leads (next_follow_up);

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL DEFAULT 'note',
  body text NOT NULL,
  due_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead activities" ON public.lead_activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER lead_activities_set_updated_at BEFORE UPDATE ON public.lead_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX lead_activities_lead_idx ON public.lead_activities (lead_id, created_at DESC);