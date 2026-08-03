import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export const VERIFICATION_LABELS: Record<SubscriptionStatus, string> = {
  trial: "Pending verification",
  active: "Verified",
  past_due: "Action required",
  cancelled: "Deactivated",
};

export const VERIFICATION_TONES: Record<SubscriptionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  trial: "outline",
  active: "default",
  past_due: "secondary",
  cancelled: "destructive",
};

export const isActiveSchool = (status: SubscriptionStatus) => status !== "cancelled";

export type SchoolRow = {
  id: string;
  name: string;
  board: string | null;
  city: string | null;
  school_type: string | null;
  principal_name: string | null;
  hr_name: string | null;
  phone: string | null;
  contact_email: string | null;
  website: string | null;
  description: string | null;
  tagline: string | null;
  logo_url: string | null;
  student_count: number | null;
  subscription_status: SubscriptionStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

const SCHOOL_COLUMNS =
  "id,name,board,city,school_type,principal_name,hr_name,phone,contact_email,website,description,tagline,logo_url,student_count,subscription_status,owner_id,created_at,updated_at";

export type SchoolListRow = SchoolRow & { activeJobs: number; applications: number };

export async function fetchAdminSchools(): Promise<SchoolListRow[]> {
  const [{ data: schools, error }, { data: jobs }, { data: applications }] = await Promise.all([
    supabase.from("schools").select(SCHOOL_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("jobs").select("id,school_id,status"),
    supabase.from("applications").select("id,job_id"),
  ]);
  if (error) throw error;

  const jobsBySchool = new Map<string, { total: number; active: number; ids: string[] }>();
  for (const j of jobs ?? []) {
    const entry = jobsBySchool.get(j.school_id) ?? { total: 0, active: 0, ids: [] };
    entry.total += 1;
    if (j.status === "published") entry.active += 1;
    entry.ids.push(j.id);
    jobsBySchool.set(j.school_id, entry);
  }
  const appsByJob = new Map<string, number>();
  for (const a of applications ?? []) appsByJob.set(a.job_id, (appsByJob.get(a.job_id) ?? 0) + 1);

  return ((schools ?? []) as SchoolRow[]).map((s) => {
    const entry = jobsBySchool.get(s.id);
    return {
      ...s,
      activeJobs: entry?.active ?? 0,
      applications: (entry?.ids ?? []).reduce((sum, id) => sum + (appsByJob.get(id) ?? 0), 0),
    };
  });
}

export type SchoolJob = {
  id: string;
  title: string;
  subject: string | null;
  grade: string | null;
  employment_type: string;
  location: string | null;
  status: Database["public"]["Enums"]["job_status"];
  created_at: string;
  updated_at: string;
  openings: number;
};

export type SchoolApplication = {
  id: string;
  job_id: string;
  teacher_id: string;
  status: string;
  created_at: string;
  jobTitle: string;
  candidate: string;
  interviewAt: string | null;
};

export type SchoolDocument = {
  id: string;
  name: string;
  doc_type: Database["public"]["Enums"]["document_type"];
  file_url: string;
  file_size_bytes: number | null;
  verified: boolean;
  created_at: string;
};

export type SchoolDetail = {
  school: SchoolRow;
  owner: { full_name: string | null; email: string | null; created_at: string } | null;
  jobs: SchoolJob[];
  applications: SchoolApplication[];
  documents: SchoolDocument[];
  interviewCount: number;
  hires: number;
  avgTimeToHireDays: number | null;
  lastActivityAt: string | null;
};

export async function fetchSchoolDetail(schoolId: string): Promise<SchoolDetail> {
  const { data: school, error } = await supabase
    .from("schools")
    .select(SCHOOL_COLUMNS)
    .eq("id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!school) throw new Error("School not found");
  const row = school as SchoolRow;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id,title,subject,grade,employment_type,location,status,created_at,updated_at,openings")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const jobList = (jobs ?? []) as SchoolJob[];
  const jobIds = jobList.map((j) => j.id);
  const jobTitle = new Map(jobList.map((j) => [j.id, j.title]));

  const [{ data: apps }, { data: owner }, { data: documents }, { data: activity }] = await Promise.all([
    jobIds.length
      ? supabase
          .from("applications")
          .select("id,job_id,teacher_id,status,created_at,updated_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("profiles").select("full_name,email,created_at").eq("id", row.owner_id).maybeSingle(),
    supabase
      .from("documents")
      .select("id,name,doc_type,file_url,file_size_bytes,verified,created_at")
      .eq("owner_id", row.owner_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("created_at")
      .eq("user_id", row.owner_id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const appRows = (apps ?? []) as {
    id: string;
    job_id: string;
    teacher_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  }[];
  const appIds = appRows.map((a) => a.id);
  const teacherIds = Array.from(new Set(appRows.map((a) => a.teacher_id)));

  const [{ data: interviews }, { data: teachers }] = await Promise.all([
    appIds.length
      ? supabase
          .from("interviews")
          .select("id,application_id,scheduled_at")
          .in("application_id", appIds)
          .order("scheduled_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    teacherIds.length
      ? supabase.from("profiles").select("id,full_name,email").in("id", teacherIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const interviewRows = (interviews ?? []) as { id: string; application_id: string; scheduled_at: string }[];
  const interviewByApp = new Map<string, string>();
  for (const i of interviewRows) if (!interviewByApp.has(i.application_id)) interviewByApp.set(i.application_id, i.scheduled_at);
  const teacherById = new Map(
    ((teachers ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((t) => [
      t.id,
      t.full_name || t.email || "Candidate",
    ]),
  );

  const hiredStatuses = new Set(["joined", "hired"]);
  const hired = appRows.filter((a) => hiredStatuses.has(a.status));
  const avgTimeToHireDays = hired.length
    ? Math.round(
        hired.reduce(
          (sum, a) => sum + (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 86400000,
          0,
        ) / hired.length,
      )
    : null;

  return {
    school: row,
    owner: (owner as SchoolDetail["owner"]) ?? null,
    jobs: jobList,
    applications: appRows.map((a) => ({
      id: a.id,
      job_id: a.job_id,
      teacher_id: a.teacher_id,
      status: a.status,
      created_at: a.created_at,
      jobTitle: jobTitle.get(a.job_id) ?? "Vacancy",
      candidate: teacherById.get(a.teacher_id) ?? "Candidate",
      interviewAt: interviewByApp.get(a.id) ?? null,
    })),
    documents: (documents ?? []) as SchoolDocument[],
    interviewCount: interviewRows.length,
    hires: hired.length,
    avgTimeToHireDays,
    lastActivityAt: (activity ?? [])[0]?.created_at ?? null,
  };
}

const PROFILE_FIELDS: (keyof SchoolRow)[] = [
  "name",
  "board",
  "city",
  "school_type",
  "principal_name",
  "hr_name",
  "phone",
  "contact_email",
  "website",
  "description",
  "logo_url",
  "student_count",
];

export function schoolProfileCompletion(school: SchoolRow) {
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = school[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
