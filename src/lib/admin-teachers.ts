import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TeacherStatus = Database["public"]["Enums"]["teacher_status"];

export const VERIFICATION_LABELS: Record<TeacherStatus, string> = {
  draft: "Pending verification",
  active: "Verified",
  placed: "Placed",
  inactive: "Inactive",
};

export const VERIFICATION_TONES: Record<TeacherStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  active: "default",
  placed: "secondary",
  inactive: "destructive",
};

export type TeacherProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  subjects: string[];
  grades: string[];
  boards: string[];
  languages: string[];
  experience_years: number;
  qualification: string | null;
  current_school: string | null;
  current_salary: number | null;
  expected_salary: number | null;
  city: string | null;
  state: string | null;
  location: string | null;
  available: boolean;
  available_from: string | null;
  notice_period_days: number | null;
  profile_photo_url: string | null;
  resume_url: string | null;
  video_demo_url: string | null;
  status: TeacherStatus;
  assigned_recruiter: string | null;
  created_at: string;
  updated_at: string;
};

const TEACHER_COLUMNS =
  "user_id,full_name,email,phone,headline,bio,subjects,grades,boards,languages,experience_years,qualification,current_school,current_salary,expected_salary,city,state,location,available,available_from,notice_period_days,profile_photo_url,resume_url,video_demo_url,status,assigned_recruiter,created_at,updated_at";

export type TeacherListRow = TeacherProfileRow & {
  avatar_url: string | null;
  applications: number;
  profileCompletion: number;
};

const PROFILE_FIELDS: (keyof TeacherProfileRow)[] = [
  "full_name",
  "headline",
  "bio",
  "subjects",
  "grades",
  "boards",
  "experience_years",
  "qualification",
  "city",
  "expected_salary",
  "profile_photo_url",
  "resume_url",
];

export function teacherProfileCompletion(t: TeacherProfileRow) {
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = t[f];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export async function fetchAdminTeachers(): Promise<TeacherListRow[]> {
  const [{ data: teachers, error }, { data: profiles }, { data: applications }] = await Promise.all([
    supabase.from("teacher_profiles").select(TEACHER_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,avatar_url"),
    supabase.from("applications").select("id,teacher_id"),
  ]);
  if (error) throw error;

  const avatarByUser = new Map((profiles ?? []).map((p) => [p.id, p.avatar_url]));
  const appsByTeacher = new Map<string, number>();
  for (const a of applications ?? []) appsByTeacher.set(a.teacher_id, (appsByTeacher.get(a.teacher_id) ?? 0) + 1);

  return ((teachers ?? []) as TeacherProfileRow[]).map((t) => ({
    ...t,
    avatar_url: avatarByUser.get(t.user_id) ?? null,
    applications: appsByTeacher.get(t.user_id) ?? 0,
    profileCompletion: teacherProfileCompletion(t),
  }));
}

export type TeacherApplication = {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  jobTitle: string;
  schoolName: string;
  interviewAt: string | null;
};

export type TeacherInterview = {
  id: string;
  application_id: string;
  scheduled_at: string;
  mode: Database["public"]["Enums"]["interview_mode"];
  status: Database["public"]["Enums"]["interview_status"];
  interviewer_name: string | null;
  outcome: string | null;
  jobTitle: string;
};

export type TeacherDocument = {
  id: string;
  name: string;
  doc_type: Database["public"]["Enums"]["document_type"];
  file_url: string;
  file_size_bytes: number | null;
  verified: boolean;
  created_at: string;
};

export type TeacherActivity = {
  id: string;
  action: string;
  detail: string | null;
  device: string | null;
  created_at: string;
};

export type TeacherInternalComment = {
  id: string;
  body: string;
  created_at: string;
  author: string | null;
  jobTitle: string;
};

export type TeacherDetail = {
  profile: TeacherProfileRow;
  avatar_url: string | null;
  applications: TeacherApplication[];
  interviews: TeacherInterview[];
  documents: TeacherDocument[];
  activity: TeacherActivity[];
  internalComments: TeacherInternalComment[];
  lastLoginAt: string | null;
};

export async function fetchTeacherDetail(userId: string): Promise<TeacherDetail> {
  const { data: teacher, error } = await supabase
    .from("teacher_profiles")
    .select(TEACHER_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!teacher) throw new Error("Teacher not found");
  const row = teacher as TeacherProfileRow;

  const [{ data: profile }, { data: apps }, { data: documents }, { data: activity }] = await Promise.all([
    supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
    supabase
      .from("applications")
      .select("id,job_id,status,created_at,updated_at")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id,name,doc_type,file_url,file_size_bytes,verified,created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id,action,detail,device,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const appRows = (apps ?? []) as { id: string; job_id: string; status: string; created_at: string; updated_at: string }[];
  const jobIds = Array.from(new Set(appRows.map((a) => a.job_id)));
  const appIds = appRows.map((a) => a.id);

  const [{ data: jobs }, { data: interviews }, { data: comments }] = await Promise.all([
    jobIds.length
      ? supabase.from("jobs").select("id,title,school_id").in("id", jobIds)
      : Promise.resolve({ data: [] as never[] }),
    appIds.length
      ? supabase
          .from("interviews")
          .select("id,application_id,scheduled_at,mode,status,interviewer_name,outcome")
          .in("application_id", appIds)
          .order("scheduled_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    appIds.length
      ? supabase
          .from("application_comments")
          .select("id,application_id,body,created_at,author_id,internal")
          .in("application_id", appIds)
          .eq("internal", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const jobRows = (jobs ?? []) as { id: string; title: string; school_id: string }[];
  const schoolIds = Array.from(new Set(jobRows.map((j) => j.school_id)));
  const { data: schools } = schoolIds.length
    ? await supabase.from("schools").select("id,name").in("id", schoolIds)
    : { data: [] as { id: string; name: string }[] };
  const schoolNameByJob = new Map<string, string>();
  const jobTitleById = new Map(jobRows.map((j) => [j.id, j.title]));
  const schoolNameById = new Map((schools ?? []).map((s) => [s.id, s.name]));
  for (const j of jobRows) schoolNameByJob.set(j.id, schoolNameById.get(j.school_id) ?? "School");

  const interviewRows = (interviews ?? []) as {
    id: string;
    application_id: string;
    scheduled_at: string;
    mode: Database["public"]["Enums"]["interview_mode"];
    status: Database["public"]["Enums"]["interview_status"];
    interviewer_name: string | null;
    outcome: string | null;
  }[];
  const interviewByApp = new Map<string, string>();
  for (const i of interviewRows) if (!interviewByApp.has(i.application_id)) interviewByApp.set(i.application_id, i.scheduled_at);
  const jobByApp = new Map(appRows.map((a) => [a.id, a.job_id]));

  const commentRows = (comments ?? []) as {
    id: string;
    application_id: string;
    body: string;
    created_at: string;
    author_id: string;
    internal: boolean;
  }[];
  const authorIds = Array.from(new Set(commentRows.map((c) => c.author_id)));
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const authorById = new Map((authors ?? []).map((a) => [a.id, a.full_name || a.email || "Admin"]));

  return {
    profile: row,
    avatar_url: (profile as { avatar_url: string | null } | null)?.avatar_url ?? null,
    applications: appRows.map((a) => ({
      id: a.id,
      job_id: a.job_id,
      status: a.status,
      created_at: a.created_at,
      updated_at: a.updated_at,
      jobTitle: jobTitleById.get(a.job_id) ?? "Vacancy",
      schoolName: schoolNameByJob.get(a.job_id) ?? "School",
      interviewAt: interviewByApp.get(a.id) ?? null,
    })),
    interviews: interviewRows.map((i) => ({
      ...i,
      jobTitle: jobTitleById.get(jobByApp.get(i.application_id) ?? "") ?? "Vacancy",
    })),
    documents: (documents ?? []) as TeacherDocument[],
    activity: (activity ?? []) as TeacherActivity[],
    internalComments: commentRows.map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author: authorById.get(c.author_id) ?? null,
      jobTitle: jobTitleById.get(jobByApp.get(c.application_id) ?? "") ?? "Vacancy",
    })),
    lastLoginAt: (activity ?? []).find((a: { action: string }) => a.action === "login")?.created_at ?? null,
  };
}

export const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const TEACHER_CSV_COLUMNS = [
  { header: "Name", value: (t: TeacherListRow) => t.full_name ?? "" },
  { header: "Email", value: (t: TeacherListRow) => t.email ?? "" },
  { header: "Phone", value: (t: TeacherListRow) => t.phone ?? "" },
  { header: "Subjects", value: (t: TeacherListRow) => t.subjects.join("; ") },
  { header: "Experience (yrs)", value: (t: TeacherListRow) => t.experience_years },
  { header: "Qualification", value: (t: TeacherListRow) => t.qualification ?? "" },
  { header: "Boards", value: (t: TeacherListRow) => t.boards.join("; ") },
  { header: "City", value: (t: TeacherListRow) => t.city ?? "" },
  { header: "State", value: (t: TeacherListRow) => t.state ?? "" },
  { header: "Expected salary", value: (t: TeacherListRow) => t.expected_salary ?? "" },
  { header: "Available", value: (t: TeacherListRow) => (t.available ? "Yes" : "No") },
  { header: "Applications", value: (t: TeacherListRow) => t.applications },
  { header: "Verification", value: (t: TeacherListRow) => VERIFICATION_LABELS[t.status] },
  { header: "Profile completion (%)", value: (t: TeacherListRow) => t.profileCompletion },
  { header: "Joined", value: (t: TeacherListRow) => t.created_at },
];
