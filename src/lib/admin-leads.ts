import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadPriority = Database["public"]["Enums"]["lead_priority"];

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type LeadActivityRow = Database["public"]["Tables"]["lead_activities"]["Row"];

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const LEAD_STATUS_TONES: Record<LeadStatus, "default" | "secondary" | "outline" | "destructive"> = {
  new: "outline",
  contacted: "secondary",
  qualified: "secondary",
  proposal: "default",
  negotiation: "default",
  won: "default",
  lost: "destructive",
};

export const LEAD_PRIORITIES: LeadPriority[] = ["low", "medium", "high"];

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const LEAD_PRIORITY_TONES: Record<LeadPriority, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
};

export type LeadListRow = LeadRow & { assignedName: string | null };

const LEAD_COLUMNS =
  "id,school_name,contact_person,phone,email,city,board,source,status,priority,next_follow_up,assigned_to,notes,converted_school_id,created_by,created_at,updated_at";

export async function fetchLeads(): Promise<LeadListRow[]> {
  const { data: leads, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (leads ?? []) as LeadRow[];
  const assignedIds = Array.from(new Set(rows.map((l) => l.assigned_to).filter(Boolean))) as string[];
  const profileById = new Map<string, string>();
  if (assignedIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", assignedIds);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
      profileById.set(p.id, p.full_name || p.email || "Recruiter");
    }
  }

  return rows.map((l) => ({ ...l, assignedName: l.assigned_to ? profileById.get(l.assigned_to) ?? null : null }));
}

export type LeadActivityWithAuthor = LeadActivityRow & { authorName: string | null };

export type LeadDetail = {
  lead: LeadRow;
  activities: LeadActivityWithAuthor[];
  assignedName: string | null;
  convertedSchoolName: string | null;
};

export async function fetchLeadDetail(leadId: string): Promise<LeadDetail> {
  const { data: lead, error } = await supabase.from("leads").select(LEAD_COLUMNS).eq("id", leadId).maybeSingle();
  if (error) throw error;
  if (!lead) throw new Error("Lead not found");
  const row = lead as LeadRow;

  const { data: activities } = await supabase
    .from("lead_activities")
    .select("id,lead_id,author_id,activity_type,body,due_at,completed,created_at,updated_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const activityRows = (activities ?? []) as LeadActivityRow[];
  const authorIds = Array.from(
    new Set([row.assigned_to, ...activityRows.map((a) => a.author_id)].filter(Boolean)),
  ) as string[];

  let profileById = new Map<string, string>();
  let convertedSchoolName: string | null = null;
  const [{ data: profiles }, convertedRes] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id,full_name,email").in("id", authorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
    row.converted_school_id
      ? supabase.from("schools").select("name").eq("id", row.converted_school_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  profileById = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [
      p.id,
      p.full_name || p.email || "Team member",
    ]),
  );
  convertedSchoolName = (convertedRes as { data: { name: string } | null }).data?.name ?? null;

  return {
    lead: row,
    activities: activityRows.map((a) => ({ ...a, authorName: a.author_id ? profileById.get(a.author_id) ?? null : null })),
    assignedName: row.assigned_to ? profileById.get(row.assigned_to) ?? null : null,
    convertedSchoolName,
  };
}

export type LeadFormInput = {
  school_name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  board?: string | null;
  source?: string | null;
  status?: LeadStatus;
  priority?: LeadPriority;
  next_follow_up?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
};

export async function createLead(input: LeadFormInput) {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...input, created_by: userRes.user?.id ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateLead(id: string, input: Partial<LeadFormInput>) {
  const { error } = await supabase.from("leads").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkUpdateLeads(ids: string[], input: Partial<LeadFormInput>) {
  const { error } = await supabase.from("leads").update(input).in("id", ids);
  if (error) throw error;
}

export type LeadActivityInput = {
  lead_id: string;
  activity_type: string;
  body: string;
  due_at?: string | null;
};

export async function addLeadActivity(input: LeadActivityInput) {
  const { data: userRes } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("lead_activities")
    .insert({ ...input, author_id: userRes.user?.id ?? null });
  if (error) throw error;
}

export async function updateLeadActivity(id: string, input: Partial<LeadActivityInput> & { completed?: boolean }) {
  const { error } = await supabase.from("lead_activities").update(input).eq("id", id);
  if (error) throw error;
}

export async function toggleLeadActivityComplete(id: string, completed: boolean) {
  const { error } = await supabase.from("lead_activities").update({ completed }).eq("id", id);
  if (error) throw error;
}

export async function deleteLeadActivity(id: string) {
  const { error } = await supabase.from("lead_activities").delete().eq("id", id);
  if (error) throw error;
}

export async function convertLeadToSchool(lead: LeadRow) {
  const { data: userRes } = await supabase.auth.getUser();
  const ownerId = userRes.user?.id;
  if (!ownerId) throw new Error("Not signed in");

  const { data: school, error } = await supabase
    .from("schools")
    .insert({
      owner_id: ownerId,
      name: lead.school_name,
      board: lead.board,
      city: lead.city,
      contact_email: lead.email,
      phone: lead.phone,
      principal_name: lead.contact_person,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: updateError } = await supabase
    .from("leads")
    .update({ converted_school_id: school.id, status: "won" })
    .eq("id", lead.id);
  if (updateError) throw updateError;

  return school.id as string;
}

export const LEAD_CSV_COLUMNS = [
  { header: "School", value: (r: LeadListRow) => r.school_name },
  { header: "Contact person", value: (r: LeadListRow) => r.contact_person ?? "" },
  { header: "Phone", value: (r: LeadListRow) => r.phone ?? "" },
  { header: "Email", value: (r: LeadListRow) => r.email ?? "" },
  { header: "City", value: (r: LeadListRow) => r.city ?? "" },
  { header: "Board", value: (r: LeadListRow) => r.board ?? "" },
  { header: "Source", value: (r: LeadListRow) => r.source ?? "" },
  { header: "Status", value: (r: LeadListRow) => LEAD_STATUS_LABELS[r.status] },
  { header: "Priority", value: (r: LeadListRow) => LEAD_PRIORITY_LABELS[r.priority] },
  { header: "Next follow-up", value: (r: LeadListRow) => r.next_follow_up ?? "" },
  { header: "Assigned recruiter", value: (r: LeadListRow) => r.assignedName ?? "" },
];

export function isFollowUpOverdue(date: string | null) {
  if (!date) return false;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

export function isFollowUpDueThisWeek(date: string | null) {
  if (!date) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const d = new Date(date);
  return d >= start && d <= end;
}
