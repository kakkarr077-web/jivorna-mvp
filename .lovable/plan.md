# Admin approval before a vacancy goes live

Today a school can post a role and have it live on the public job board instantly: `jobs.status` defaults to `'published'`, and the "School owners manage own jobs" access rule lets a school owner set any status they like. The homepage promises admin review first. This plan closes that gap.

## What changes for people using the app

**Schools**
- A new vacancy starts as a **Draft**, not live.
- The "Publish" button on the vacancies list becomes **Submit for review**, which moves the role to a new **In review** state.
- Schools can still create, edit, save drafts, and close roles. They can no longer make a role live themselves.
- Editing a role that is already live keeps it live — the review gate applies to going live, not to routine edits.

**Admins**
- The admin vacancies table gains a **Pending review** filter and two actions on each submitted role: **Approve & publish** and **Send back to draft**.
- Only admins can put a role live.

**Existing live roles** are untouched — nothing currently on the public board disappears.

## Migration SQL

Two migrations are needed, because Postgres will not let a newly added enum value be used inside the same transaction that adds it.

### Migration 1 — add the review state

```sql
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'pending_review';
```

### Migration 2 — default and access rules

```sql
-- 1. New vacancies start as drafts
ALTER TABLE public.jobs ALTER COLUMN status SET DEFAULT 'draft'::job_status;

-- 2. Replace the blanket school policy with per-command rules
DROP POLICY IF EXISTS "School owners manage own jobs" ON public.jobs;

CREATE POLICY "School owners insert own jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  AND status <> 'published'::job_status
);

CREATE POLICY "School owners update own jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
);

CREATE POLICY "School owners delete own jobs"
ON public.jobs FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
);

-- 3. Only admins may move a job INTO published (WITH CHECK cannot see the old row)
CREATE OR REPLACE FUNCTION public.enforce_job_publish_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'published'::job_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published'::job_status)
  THEN
    RAISE EXCEPTION 'Only an administrator can publish a vacancy';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_job_publish_is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_job_publish_is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_job_publish_is_admin() FROM authenticated;

DROP TRIGGER IF EXISTS enforce_job_publish_is_admin ON public.jobs;
CREATE TRIGGER enforce_job_publish_is_admin
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_publish_is_admin();
```

Why both a policy and a trigger: an access rule's `WITH CHECK` only sees the row *after* the change, so on its own it cannot tell "school is publishing a draft" from "school is editing a role an admin already published". The trigger compares old and new, so schools keep edit rights on live roles while the transition into `published` stays admin-only. The `Admins manage jobs` rule and the public "anyone can view published jobs" rule are unchanged.

## Affected files

- `src/lib/pipeline.ts` *(or a small new `src/lib/jobStatus.ts`)* — one shared place for job status labels and badge tones, including the new `pending_review` → "In review".
- `src/routes/_authenticated/school.jobs.tsx` — widen the `JobRow["status"]` union; replace the **Publish** button with **Submit for review** (sets `pending_review`, shown for drafts only); adjust status badge tones and toast copy; drop `"Publish vacancy"` as the create submit label.
- `src/components/school/JobForm.tsx` — remove `published` from the school-facing status select and from the preview submit path (currently line 218 submits as `published`); the primary action becomes save-as-draft / submit-for-review. Keep the ≥40-character description rule, applied on submit-for-review.
- `src/routes/_authenticated/admin.jobs.tsx` — add a status filter (All / Pending review / Published / Draft / Closed) defaulting to Pending review when any exist, plus per-row **Approve & publish** and **Send back to draft** mutations with query invalidation and toasts.
- `src/integrations/supabase/types.ts` — regenerated automatically after the migrations.

## Notes

- The existing `jobs_notify_match` trigger fires teacher "new job match" notifications when a row becomes `published`. With this change those now fire at admin approval, which is the correct moment.
- No table is created, so no new GRANTs are required.
- Schools may still set `closed` and `draft` freely; only `published` is gated.
