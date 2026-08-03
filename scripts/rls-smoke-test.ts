/**
 * RLS smoke test — verifies the security rules that protect applications and jobs.
 *
 * Run:
 *   bun run scripts/rls-smoke-test.ts
 *
 * Required environment variables (never hardcode credentials):
 *   VITE_SUPABASE_URL              backend URL (auto-loaded from .env by bun)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  public/anon key (auto-loaded from .env by bun)
 *   TEST_TEACHER_EMAIL / TEST_TEACHER_PASSWORD
 *   TEST_SCHOOL_EMAIL  / TEST_SCHOOL_PASSWORD
 *   TEST_ADMIN_EMAIL   / TEST_ADMIN_PASSWORD
 *
 * The script provisions its own throwaway job + application, runs the checks as
 * each role through the normal public client (so RLS and triggers apply exactly
 * as they do in the browser), then deletes what it created.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Role = "teacher" | "school" | "admin";

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
};

const SUPABASE_URL = env("VITE_SUPABASE_URL");
const SUPABASE_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY");

const results: { name: string; ok: boolean; detail: string }[] = [];

function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(role: Role): Promise<{ client: SupabaseClient; userId: string }> {
  const prefix = `TEST_${role.toUpperCase()}`;
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: env(`${prefix}_EMAIL`),
    password: env(`${prefix}_PASSWORD`),
  });
  if (error || !data.user) {
    console.error(`Could not sign in as ${role}: ${error?.message ?? "no user returned"}`);
    process.exit(1);
  }
  return { client, userId: data.user.id };
}

async function main() {
  const teacher = await signIn("teacher");
  const school = await signIn("school");
  const admin = await signIn("admin");

  // ---- fixtures -----------------------------------------------------------
  const { data: schoolRow, error: schoolErr } = await school.client
    .from("schools")
    .select("id")
    .eq("owner_id", school.userId)
    .maybeSingle();
  if (schoolErr || !schoolRow) {
    console.error(`Test school user owns no school record: ${schoolErr?.message ?? "none found"}`);
    process.exit(1);
  }

  const { data: job, error: jobErr } = await school.client
    .from("jobs")
    .insert({
      school_id: schoolRow.id,
      title: "RLS smoke test role (temporary)",
      subject: "Mathematics",
      employment_type: "full_time",
      status: "draft",
    })
    .select("id, status")
    .single();
  if (jobErr || !job) {
    console.error(`Could not create fixture job: ${jobErr?.message}`);
    process.exit(1);
  }

  let applicationId: string | null = null;

  try {
    // ---- 3. non-admin cannot publish a job -------------------------------
    const publishAsSchool = await school.client
      .from("jobs")
      .update({ status: "published" })
      .eq("id", job.id)
      .select("id");
    const schoolPublished =
      !publishAsSchool.error && (publishAsSchool.data?.length ?? 0) > 0;
    check(
      "A non-admin cannot set a job's status to 'published'",
      !schoolPublished,
      publishAsSchool.error?.message ?? (schoolPublished ? "update succeeded" : "no rows changed"),
    );

    // School may still move it to pending_review; admin publishes it.
    await school.client.from("jobs").update({ status: "pending_review" }).eq("id", job.id);
    const publishAsAdmin = await admin.client
      .from("jobs")
      .update({ status: "published" })
      .eq("id", job.id)
      .select("id, status")
      .single();
    check(
      "An admin can publish a job (control case)",
      !publishAsAdmin.error && publishAsAdmin.data?.status === "published",
      publishAsAdmin.error?.message ?? "",
    );

    // ---- 4. non-admin cannot read another school's draft jobs ------------
    const { data: otherDraft } = await admin.client
      .from("jobs")
      .select("id, school_id")
      .neq("school_id", schoolRow.id)
      .in("status", ["draft", "pending_review"])
      .limit(1)
      .maybeSingle();

    if (!otherDraft) {
      check(
        "A non-admin cannot read another school's draft jobs",
        false,
        "skipped: no draft job from another school exists to probe",
      );
    } else {
      const asTeacher = await teacher.client.from("jobs").select("id").eq("id", otherDraft.id);
      const asSchool = await school.client.from("jobs").select("id").eq("id", otherDraft.id);
      check(
        "A non-admin cannot read another school's draft jobs",
        (asTeacher.data?.length ?? 0) === 0 && (asSchool.data?.length ?? 0) === 0,
        `teacher rows=${asTeacher.data?.length ?? 0}, school rows=${asSchool.data?.length ?? 0}`,
      );
    }

    // ---- fixture application ---------------------------------------------
    const applied = await teacher.client
      .from("applications")
      .insert({ job_id: job.id, teacher_id: teacher.userId, cover_letter: "smoke test" })
      .select("id")
      .single();
    if (applied.error || !applied.data) {
      console.error(`Could not create fixture application: ${applied.error?.message}`);
      process.exit(1);
    }
    applicationId = applied.data.id;

    // ---- 1. a teacher cannot read another teacher's applications ---------
    const { data: visible } = await teacher.client.from("applications").select("id, teacher_id");
    const foreign = (visible ?? []).filter((a) => a.teacher_id !== teacher.userId);
    check(
      "A teacher only sees their own applications",
      foreign.length === 0,
      `${foreign.length} foreign row(s) visible of ${visible?.length ?? 0}`,
    );

    const { data: otherApp } = await admin.client
      .from("applications")
      .select("id, teacher_id")
      .neq("teacher_id", teacher.userId)
      .limit(1)
      .maybeSingle();
    if (otherApp) {
      const probe = await teacher.client.from("applications").select("id").eq("id", otherApp.id);
      check(
        "A teacher cannot read a specific other teacher's application by id",
        (probe.data?.length ?? 0) === 0,
        `rows=${probe.data?.length ?? 0}`,
      );
    }

    // ---- 2. a school cannot repoint an application -----------------------
    const statusUpdate = await school.client
      .from("applications")
      .update({ status: "screening" })
      .eq("id", applicationId)
      .select("id")
      .single();
    check(
      "A school can update the status of an application to its own job (control case)",
      !statusUpdate.error,
      statusUpdate.error?.message ?? "",
    );

    const teacherIdUpdate = await school.client
      .from("applications")
      .update({ teacher_id: school.userId })
      .eq("id", applicationId)
      .select("id");
    check(
      "A school cannot change an application's teacher_id",
      !!teacherIdUpdate.error || (teacherIdUpdate.data?.length ?? 0) === 0,
      teacherIdUpdate.error?.message ?? "update was accepted",
    );

    const { data: otherJob } = await admin.client
      .from("jobs")
      .select("id")
      .neq("id", job.id)
      .limit(1)
      .maybeSingle();
    if (otherJob) {
      const jobIdUpdate = await school.client
        .from("applications")
        .update({ job_id: otherJob.id })
        .eq("id", applicationId)
        .select("id");
      check(
        "A school cannot change an application's job_id",
        !!jobIdUpdate.error || (jobIdUpdate.data?.length ?? 0) === 0,
        jobIdUpdate.error?.message ?? "update was accepted",
      );
    }

    // Confirm the row is still pointing where it started.
    const { data: finalRow } = await admin.client
      .from("applications")
      .select("teacher_id, job_id")
      .eq("id", applicationId)
      .single();
    check(
      "The application still points at the original teacher and job",
      finalRow?.teacher_id === teacher.userId && finalRow?.job_id === job.id,
      JSON.stringify(finalRow),
    );
  } finally {
    // ---- cleanup ----------------------------------------------------------
    if (applicationId) await admin.client.from("applications").delete().eq("id", applicationId);
    await admin.client.from("jobs").delete().eq("id", job.id);
    await Promise.all([
      teacher.client.auth.signOut(),
      school.client.auth.signOut(),
      admin.client.auth.signOut(),
    ]);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

void main();
