ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruiter';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'interview_completed';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'offer_accepted';