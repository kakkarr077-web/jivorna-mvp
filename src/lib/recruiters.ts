/** Recruiter / staff directory + assignment helpers shared by every module. */
import { supabase } from "@/integrations/supabase/client";

export type Recruiter = {
  id: string;
  name: string;
  email: string | null;
  role: "admin" | "recruiter";
};

export const UNASSIGNED = "__unassigned__";

/** Every admin + recruiter, usable as an "assigned to" option. */
export async function fetchRecruiters(): Promise<Recruiter[]> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id,role")
    .in("role", ["admin", "recruiter"]);
  if (error) throw error;
  const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const roleById = new Map<string, "admin" | "recruiter">();
  for (const r of roles ?? []) {
    const role = r.role as "admin" | "recruiter";
    // Admin wins when a user holds both roles.
    if (role === "admin" || !roleById.has(r.user_id)) roleById.set(r.user_id, role);
  }

  return ids
    .map((id) => {
      const p = byId.get(id);
      return {
        id,
        name: p?.full_name?.trim() || p?.email || "Team member",
        email: p?.email ?? null,
        role: roleById.get(id) ?? "recruiter",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type AssignableTable = "schools" | "jobs" | "teacher_profiles" | "applications";

const KEY_COLUMN: Record<AssignableTable, string> = {
  schools: "id",
  jobs: "id",
  teacher_profiles: "user_id",
  applications: "id",
};

/** Set (or clear, with null) the assigned recruiter on any assignable record. */
export async function assignRecruiter(
  table: AssignableTable,
  recordIds: string[],
  recruiterId: string | null,
) {
  if (recordIds.length === 0) return;
  const { error } = await supabase
    .from(table)
    .update({ assigned_recruiter: recruiterId })
    .in(KEY_COLUMN[table], recordIds);
  if (error) throw error;
}

export const recruiterName = (recruiters: Recruiter[], id: string | null | undefined) =>
  id ? (recruiters.find((r) => r.id === id)?.name ?? "Unknown") : "Unassigned";
