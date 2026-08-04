import { supabase } from "@/integrations/supabase/client";
import type { JobStatus } from "@/lib/jobStatus";

export type AdminJobRow = {
  id: string;
  title: string;
  school_id: string;
  schoolName: string;
  board: string | null;
  subject: string | null;
  grade: string | null;
  location: string | null;
  employment_type: string;
  min_experience_years: number;
  salary_min: number | null;
  salary_max: number | null;
  salary_range: string | null;
  description: string | null;
  benefits: string | null;
  required_skills: string[] | null;
  status: JobStatus;
  assigned_recruiter: string | null;
  applications: number;
  createdBy: string;
  created_at: string;
  updated_at: string;
};

export type AdminSchoolOption = { id: string; name: string; board: string | null; city: string | null };

const JOB_COLUMNS =
  "id,title,school_id,board,subject,grade,location,employment_type,min_experience_years,salary_min,salary_max,salary_range,description,benefits,required_skills,status,assigned_recruiter,created_at,updated_at";

export async function fetchAdminJobs(): Promise<AdminJobRow[]> {
  const [{ data: jobs, error }, { data: schools }, { data: apps }] = await Promise.all([
    supabase.from("jobs").select(JOB_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("schools").select("id,name,board,city,owner_id"),
    supabase.from("applications").select("id,job_id"),
  ]);
  if (error) throw error;

  const ownerIds = Array.from(new Set((schools ?? []).map((s) => s.owner_id)));
  const { data: profiles } = ownerIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const ownerById = new Map((profiles ?? []).map((p) => [p.id, p.full_name?.trim() || p.email || ""]));
  const schoolById = new Map((schools ?? []).map((s) => [s.id, s]));
  const appsByJob = new Map<string, number>();
  for (const a of apps ?? []) appsByJob.set(a.job_id, (appsByJob.get(a.job_id) ?? 0) + 1);

  return (jobs ?? []).map((j) => {
    const school = schoolById.get(j.school_id);
    return {
      ...j,
      status: j.status as JobStatus,
      schoolName: school?.name ?? "Unknown school",
      board: j.board ?? school?.board ?? null,
      applications: appsByJob.get(j.id) ?? 0,
      createdBy: (school ? ownerById.get(school.owner_id) : "") || school?.name || "—",
    } as AdminJobRow;
  });
}

export async function fetchSchoolOptions(): Promise<AdminSchoolOption[]> {
  const { data, error } = await supabase.from("schools").select("id,name,board,city").order("name");
  if (error) throw error;
  return data ?? [];
}

export const salaryRangeLabel = (j: Pick<AdminJobRow, "salary_min" | "salary_max" | "salary_range">) => {
  if (j.salary_min != null && j.salary_max != null)
    return `₹${j.salary_min.toLocaleString("en-IN")} – ₹${j.salary_max.toLocaleString("en-IN")}`;
  if (j.salary_min != null) return `From ₹${j.salary_min.toLocaleString("en-IN")}`;
  if (j.salary_max != null) return `Up to ₹${j.salary_max.toLocaleString("en-IN")}`;
  return j.salary_range || "On application";
};

export const CSV_HEADERS = [
  "Job title",
  "School",
  "Board",
  "Subject",
  "Grade",
  "City",
  "Employment type",
  "Salary range",
  "Applications",
  "Status",
  "Created by",
  "Created date",
  "Last updated",
];

const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function jobsToCsv(rows: AdminJobRow[], statusLabel: (s: string) => string) {
  const lines = [CSV_HEADERS.map(escapeCell).join(",")];
  for (const j of rows) {
    lines.push(
      [
        j.title,
        j.schoolName,
        j.board ?? "",
        j.subject ?? "",
        j.grade ?? "",
        j.location ?? "",
        j.employment_type,
        salaryRangeLabel(j),
        String(j.applications),
        statusLabel(j.status),
        j.createdBy,
        new Date(j.created_at).toISOString().slice(0, 10),
        new Date(j.updated_at).toISOString().slice(0, 10),
      ]
        .map((c) => escapeCell(String(c)))
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
