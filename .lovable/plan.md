# Get you into the Jivorna admin dashboard

## What I found

The admin area already exists at `/admin` and is fully built (Users, Schools, Teachers, Jobs, Applications, Interviews, plus Leads, Tasks, Calendar, Reports and Invoices). The reason you've never seen it: **there is no admin account in the database.** Every real signup so far was created with the `teacher` role, so the role gate quietly redirects you to the teacher dashboard instead of `/admin`.

Current accounts:

```text
adrianavega1903@gmail.com   teacher
rkakk19@gmail.com           teacher
+ 6 demo accounts (school / teacher)
```

## Plan

### 1. Make your account an admin
Promote one real account (I'll use `rkakk19@gmail.com` unless you tell me otherwise) to the `admin` role in `user_roles`. That single change unlocks `/admin` and, from there, the built-in Users page lets you grant admin/recruiter to anyone else without touching the database again.

### 2. Fix the default sign-up path for admins
Right now a signup that asks for the admin role is silently downgraded to `teacher`. Leave that safety in place (self-serve admin signup should stay impossible) but make sure the Users page in the admin portal is the one documented way to create more admins.

### 3. Give you a focused landing screen
The current `/admin` home is a recruiter workspace (tasks, follow-ups, pipeline). Since what you asked for is "see users, post jobs, review candidate and school profiles", I'll add a clear top row of four big entry cards on the admin home:

- **Users** — everyone on the platform, with role badges and role controls
- **Post a job** — opens the job editor directly
- **Teachers** — candidate list, click through to full profile
- **Schools** — school list, click through to full profile

Nothing existing is removed; the recruiter widgets stay below the cards.

### 4. Walk-through
Once you're admin, sign in and go to `/admin`. I'll confirm each of the four flows works end to end: view a user, post and publish a job, open a teacher profile, open a school profile.

## Technical notes

- Step 1 is a small data change to `public.user_roles` (insert `admin` for your user id) — no schema migration needed.
- Roles stay in the separate `user_roles` table checked by the `has_role` / `is_staff` security-definer functions, so RLS keeps working unchanged.
- Step 3 is presentation-only: a new quick-actions block at the top of `src/routes/_authenticated/admin.index.tsx`, reusing the existing routes.
- Admin publishing rights already exist: `enforce_job_publish_is_admin` allows only admins to move a vacancy to `published`.

## Question before I start

Which email should become the admin — `rkakk19@gmail.com`, `adrianavega1903@gmail.com`, or a different address you'll sign up with?
