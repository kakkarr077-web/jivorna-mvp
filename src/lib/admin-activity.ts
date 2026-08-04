import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Building2, Briefcase, Send, CalendarClock, Award, type LucideIcon } from "lucide-react";

export type ActivityEntity = "teacher" | "school" | "job" | "application" | "interview";

export type ActivityItem = {
  id: string;
  entity: ActivityEntity;
  title: string;
  description?: string | null;
  at: string;
  icon: LucideIcon;
  href?: string;
  searchText: string;
};

export const ACTIVITY_FILTERS: { value: ActivityEntity | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "teacher", label: "Teachers" },
  { value: "school", label: "Schools" },
  { value: "job", label: "Jobs" },
  { value: "application", label: "Applications" },
  { value: "interview", label: "Interviews" },
];

const HIRE_STATUSES = new Set(["hired", "joined"]);

const FETCH_LIMIT = 200;

export async function fetchActivityFeed(): Promise<ActivityItem[]> {
  const [
    { data: teachers },
    { data: schools },
    { data: jobs },
    { data: applications },
    { data: appEvents },
    { data: interviews },
  ] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("user_id,full_name,city,subjects,created_at")
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT),
    supabase
      .from("schools")
      .select("id,name,city,created_at")
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT),
    supabase
      .from("jobs")
      .select("id,title,school_id,status,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(FETCH_LIMIT),
    supabase
      .from("applications")
      .select("id,job_id,teacher_id,status,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT),
    supabase
      .from("application_events")
      .select("id,application_id,summary,event_type,to_status,created_at")
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT),
    supabase
      .from("interviews")
      .select("id,application_id,scheduled_at,created_at,mode,status")
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT),
  ]);

  const schoolNameById = new Map((schools ?? []).map((s) => [s.id, s.name]));
  const jobTitleById = new Map((jobs ?? []).map((j) => [j.id, j.title]));
  const appById = new Map((applications ?? []).map((a) => [a.id, a]));

  const items: ActivityItem[] = [];

  for (const t of teachers ?? []) {
    items.push({
      id: `teacher-${t.user_id}`,
      entity: "teacher",
      title: `${t.full_name || "A teacher"} registered`,
      description: t.city ? `Based in ${t.city}` : undefined,
      at: t.created_at,
      icon: GraduationCap,
      href: "/admin/teachers",
      searchText: `${t.full_name ?? ""} ${t.city ?? ""} ${(t.subjects ?? []).join(" ")}`,
    });
  }

  for (const s of schools ?? []) {
    items.push({
      id: `school-${s.id}`,
      entity: "school",
      title: `${s.name} registered`,
      description: s.city ? `Located in ${s.city}` : undefined,
      at: s.created_at,
      icon: Building2,
      href: `/admin/schools/${s.id}`,
      searchText: `${s.name} ${s.city ?? ""}`,
    });
  }

  for (const j of jobs ?? []) {
    if (j.status !== "published") continue;
    const schoolName = schoolNameById.get(j.school_id) ?? "a school";
    items.push({
      id: `job-${j.id}`,
      entity: "job",
      title: `${j.title} published`,
      description: `Posted by ${schoolName}`,
      at: j.updated_at ?? j.created_at,
      icon: Briefcase,
      href: "/admin/jobs",
      searchText: `${j.title} ${schoolName}`,
    });
  }

  for (const a of applications ?? []) {
    const jobTitle = jobTitleById.get(a.job_id) ?? "a vacancy";
    items.push({
      id: `application-${a.id}`,
      entity: "application",
      title: `New application for ${jobTitle}`,
      description: `Status: ${a.status}`,
      at: a.created_at,
      icon: Send,
      href: "/admin/jobs",
      searchText: `${jobTitle} ${a.status}`,
    });
    if (a.status === "offer") {
      items.push({
        id: `offer-${a.id}`,
        entity: "application",
        title: `Offer extended for ${jobTitle}`,
        at: a.updated_at,
        icon: Award,
        href: "/admin/jobs",
        searchText: `${jobTitle} offer`,
      });
    }
    if (HIRE_STATUSES.has(a.status)) {
      items.push({
        id: `hired-${a.id}`,
        entity: "application",
        title: `Candidate hired for ${jobTitle}`,
        at: a.updated_at,
        icon: Award,
        href: "/admin/jobs",
        searchText: `${jobTitle} hired`,
      });
    }
  }

  for (const e of appEvents ?? []) {
    const app = appById.get(e.application_id);
    const jobTitle = app ? jobTitleById.get(app.job_id) ?? "a vacancy" : "an application";
    items.push({
      id: `event-${e.id}`,
      entity: "application",
      title: e.summary || `Application stage changed${e.to_status ? ` to ${e.to_status}` : ""}`,
      description: `For ${jobTitle}`,
      at: e.created_at,
      icon: Send,
      href: "/admin/jobs",
      searchText: `${jobTitle} ${e.to_status ?? ""} ${e.summary ?? ""}`,
    });
  }

  for (const i of interviews ?? []) {
    const app = appById.get(i.application_id);
    const jobTitle = app ? jobTitleById.get(app.job_id) ?? "a vacancy" : "an application";
    items.push({
      id: `interview-${i.id}`,
      entity: "interview",
      title: `Interview scheduled for ${jobTitle}`,
      description: `${i.mode ?? "interview"} · ${new Date(i.scheduled_at).toLocaleString()}`,
      at: i.created_at,
      icon: CalendarClock,
      href: "/admin/jobs",
      searchText: `${jobTitle} interview`,
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
