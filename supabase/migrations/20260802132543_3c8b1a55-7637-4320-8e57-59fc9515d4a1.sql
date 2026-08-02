ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS board text,
  ADD COLUMN IF NOT EXISTS benefits text,
  ADD COLUMN IF NOT EXISTS required_skills text[] NOT NULL DEFAULT '{}';