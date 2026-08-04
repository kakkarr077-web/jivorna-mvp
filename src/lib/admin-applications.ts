import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ATS_STAGES, atsStage, type AtsStageId, statusForStage } from "@/lib/ats";
import { assignRecruiter } from "@/lib/recruiters";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export type AdminApplicationRow = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  cover_letter: string | null;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string | null;
  teacher_subjects: string[];
  teacher_city: string | null;
  teacher_experience_years: number | null;
  job_id: string;
  job_title: string;
  school_id: string;
  school_name: string;
  assigned_recruiter: string | null;
  expected_salary: number | null;
  archived: boolean;
};

/** Fetch every application with joined teacher / job / school info for the admin CRM. */
export async function fetchAdminApplications(): Promise<AdminApplicationRow[]> {
  const { data: apps, error } = await supabase
    .from("applications")
    .select(
      "id,status,created_at,updated_at,cover_letter,teacher_id,job_id,assigned_recruiter,expected_salary,archived",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = apps ?? [];
  if (rows.length === 0) return [];

  const jobIds = [...new Set(rows.map((r) => r.job_id))];
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id))];

  const [{ data: jobs, error: jobsErr }, { data: profiles, error: profilesErr }] = await Promise.all([
    supabase.from("jobs").select("id,title,school_id").in("id", jobIds),
    supabase
      .from("teacher_profiles")
      .select("user_id,full_name,email,subjects,city,experience_years")
      .in("user_id", teacherIds),
  ]);
  if (jobsErr) throw jobsErr;
  if (profilesErr) throw profilesErr;

  const schoolIds = [...new Set((jobs ?? []).map((j) => j.school_id))];
  const { data: schools, error: schoolsErr } = await supabase
    .from("schools")
    .select("id,name")
    .in("id", schoolIds);
  if (schoolsErr) throw schoolsErr;

  const jobMap = new Map((jobs ?? []).map((j) => [j.id, j]));
  const schoolMap = new Map((schools ?? []).map((s) => [s.id, s.name]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return rows.map((a) => {
    const job = jobMap.get(a.job_id);
    const profile = profileMap.get(a.teacher_id);
    return {
      id: a.id,
      status: a.status,
      created_at: a.created_at,
      updated_at: a.updated_at,
      cover_letter: a.cover_letter,
      teacher_id: a.teacher_id,
      teacher_name: profile?.full_name ?? "Candidate",
      teacher_email: profile?.email ?? null,
      teacher_subjects: profile?.subjects ?? [],
      teacher_city: profile?.city ?? null,
      teacher_experience_years: profile?.experience_years ?? null,
      job_id: a.job_id,
      job_title: job?.title ?? "Vacancy",
      school_id: job?.school_id ?? "",
      school_name: schoolMap.get(job?.school_id ?? "") ?? "—",
      assigned_recruiter: a.assigned_recruiter,
      expected_salary: a.expected_salary,
      archived: a.archived ?? false,
    };
  });
}

export type AdminApplicationDetail = AdminApplicationRow;

export async function fetchAdminApplication(id: string): Promise<AdminApplicationDetail | null> {
  const all = await fetchAdminApplications();
  return all.find((a) => a.id === id) ?? null;
}

/** Group applications by their ATS stage — used by the Kanban view. */
export function groupByStage(rows: AdminApplicationRow[]): Map<AtsStageId, AdminApplicationRow[]> {
  const map = new Map<AtsStageId, AdminApplicationRow[]>(ATS_STAGES.map((s) => [s.id, []]));
  for (const row of rows) {
    const stage = atsStage(row.status);
    map.get(stage)?.push(row);
  }
  return map;
}

export const APPLICATION_CSV_COLUMNS = [
  { header: "Candidate", value: (r: AdminApplicationRow) => r.teacher_name },
  { header: "Email", value: (r: AdminApplicationRow) => r.teacher_email ?? "" },
  { header: "Job", value: (r: AdminApplicationRow) => r.job_title },
  { header: "School", value: (r: AdminApplicationRow) => r.school_name },
  { header: "Stage", value: (r: AdminApplicationRow) => atsStage(r.status) },
  { header: "Recruiter", value: (r: AdminApplicationRow) => r.assigned_recruiter ?? "" },
  { header: "Expected salary", value: (r: AdminApplicationRow) => r.expected_salary ?? "" },
  { header: "Applied on", value: (r: AdminApplicationRow) => r.created_at },
  { header: "Last updated", value: (r: AdminApplicationRow) => r.updated_at },
];

/** Update an application's stage and insert an audit event. A DB trigger logs the communications entry. */
export async function updateApplicationStage({
  applicationId,
  from,
  to,
  actorId,
}: {
  applicationId: string;
  from: string;
  to: AtsStageId;
  actorId: string | undefined;
}) {
  if (atsStage(from) === to) return;
  const nextStatus = statusForStage(to);
  const { error } = await supabase.from("applications").update({ status: nextStatus }).eq("id", applicationId);
  if (error) throw error;
  const label = ATS_STAGES.find((s) => s.id === to)?.label ?? to;
  const { error: eventErr } = await supabase.from("application_events").insert({
    application_id: applicationId,
    actor_id: actorId ?? null,
    event_type: "stage_change",
    from_status: atsStage(from),
    to_status: to,
    summary: `Moved to ${label}`,
  });
  if (eventErr) throw eventErr;
}

/** Batched status update + one audit event per application. */
export async function bulkUpdateStage(ids: string[], stage: AtsStageId, actorId: string | undefined) {
  if (ids.length === 0) return;
  const nextStatus = statusForStage(stage);
  const { error } = await supabase.from("applications").update({ status: nextStatus }).in("id", ids);
  if (error) throw error;
  const label = ATS_STAGES.find((s) => s.id === stage)?.label ?? stage;
  const { error: eventErr } = await supabase.from("application_events").insert(
    ids.map((id) => ({
      application_id: id,
      actor_id: actorId ?? null,
      event_type: "stage_change",
      to_status: stage,
      summary: `Moved to ${label}`,
    })),
  );
  if (eventErr) throw eventErr;
}

export async function bulkAssignRecruiter(ids: string[], recruiterId: string | null) {
  await assignRecruiter("applications", ids, recruiterId);
}

export async function bulkArchive(ids: string[], archived: boolean) {
  if (ids.length === 0) return;
  const { error } = await supabase.from("applications").update({ archived }).in("id", ids);
  if (error) throw error;
}

export async function bulkReject(ids: string[], actorId: string | undefined) {
  await bulkUpdateStage(ids, "rejected", actorId);
}
