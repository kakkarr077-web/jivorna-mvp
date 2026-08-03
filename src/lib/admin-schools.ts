import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export type AdminSchoolRow = {
  id: string;
  name: string;
  board: string | null;
  city: string | null;
  school_type: string | null;
  contact_person: string | null;
  phone: string | null;
  contact_email: string | null;
  website: string | null;
  description: string | null;
  tagline: string | null;
  student_count: number | null;
  subscription_status: SubscriptionStatus;
  created_at: string;
  active_jobs: number;
  total_jobs: number;
  applications: number;
};

export const VERIFICATION_LABEL: Record<SubscriptionStatus, string> = {
  active: "Verified",
  trial: "Pending",
  past_due: "Past due",
  cancelled: "Suspended",
};

export const verificationVariant = (
  status: SubscriptionStatus,
): "default" | "secondary" | "outline" | "destructive" =>
  status === "active" ? "default" : status === "trial" ? "secondary" : status === "past_due" ? "outline" : "destructive";

/** Admin-only aggregate read. RLS still applies: only admins can select every school. */
export async function fetchAdminSchools(): Promise<AdminSchoolRow[]> {
  const [{ data: schools, error }, { data: jobs }, { data: apps }] = await Promise.all([
    supabase
      .from("schools")
      .select(
        "id,name,board,city,school_type,principal_name,hr_name,phone,contact_email,website,description,tagline,student_count,subscription_status,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("id,school_id,status"),
    supabase.from("applications").select("id,job_id"),
  ]);
  if (error) throw error;

  const appsPerJob = new Map<string, number>();
  (apps ?? []).forEach((a) => appsPerJob.set(a.job_id, (appsPerJob.get(a.job_id) ?? 0) + 1));

  const stats = new Map<string, { active: number; total: number; applications: number }>();
  (jobs ?? []).forEach((j) => {
    const s = stats.get(j.school_id) ?? { active: 0, total: 0, applications: 0 };
    s.total += 1;
    if (j.status === "published") s.active += 1;
    s.applications += appsPerJob.get(j.id) ?? 0;
    stats.set(j.school_id, s);
  });

  return (schools ?? []).map((s) => {
    const stat = stats.get(s.id) ?? { active: 0, total: 0, applications: 0 };
    return {
      id: s.id,
      name: s.name,
      board: s.board,
      city: s.city,
      school_type: s.school_type,
      contact_person: s.hr_name || s.principal_name || null,
      phone: s.phone,
      contact_email: s.contact_email,
      website: s.website,
      description: s.description,
      tagline: s.tagline,
      student_count: s.student_count,
      subscription_status: s.subscription_status,
      created_at: s.created_at,
      active_jobs: stat.active,
      total_jobs: stat.total,
      applications: stat.applications,
    };
  });
}
