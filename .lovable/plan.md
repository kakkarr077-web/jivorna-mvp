# Owning and controlling Jivorna's data

## The short answer

Jivorna's backend is Lovable Cloud, which is a fully managed Supabase project. Once Cloud is added to a project it cannot be swapped for a Supabase project in your own account — there is no "point this app at my Supabase" switch. Disconnecting Cloud (Cloud tab → Advanced → Disconnect, workspace admin only) is irreversible and permanently deletes the database, storage and functions; the app would stop working.

So "own/control the data" splits into two realistic routes.

## Route A — Stay on Cloud, take ownership of the data (recommended)

You keep the working app and get a full copy of your data whenever you want it.

1. Open the Cloud tab → Advanced settings → **Export data**. Lovable prepares a full export and notifies you when it is ready.
2. Repeat this on a schedule you're comfortable with (e.g. monthly, and before big changes) so you always hold a current copy.
3. Optionally I add an in-app admin export: CSV download buttons for the core CRM tables (schools, teachers, jobs, applications, invoices, leads) from the admin portal, so day-to-day data is exportable without touching Cloud settings.

Trade-off: data lives in the Lovable-managed Supabase project; you hold copies but not the dashboard.

## Route B — Rebuild on your own Supabase project

Only worth it if you need direct Supabase dashboard access, your own billing, or your own region/compliance setup.

1. Create a Supabase project in your own account.
2. Turn off Cloud for future projects: Connectors → Lovable Cloud → Disable Cloud.
3. Start a **new** Lovable project connected to your Supabase via the Supabase integration.
4. Port the schema (tables, enums, RLS policies, grants, functions, triggers) and the app code across, then import the exported data.
5. Re-create auth users, storage buckets, secrets and the email sending domain in the new project.

Trade-off: this is a full migration project, not a setting. Jivorna currently has ~25 tables, 20+ database functions, 40 triggers, two storage buckets and role-based RLS throughout, so it is substantial work and the current project keeps running unchanged until the new one is ready.

## What I'd do next

If Route A: say the word and I'll build the admin CSV export screens.
If Route B: I'll first produce a complete schema dump (SQL for tables, policies, grants, functions, triggers) you can run against your own Supabase project, and a migration checklist — no changes to the live app.

## Technical notes

- Cloud injects `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; these are reserved and cannot be repointed at another Supabase instance from code.
- `src/integrations/supabase/*` is auto-generated against the Cloud project and is not hand-editable.
- Auth users cannot be exported through the app; they migrate via Supabase's own user import.
