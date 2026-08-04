import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchAdminApplications, type AdminApplicationRow } from "@/lib/admin-applications";

export type InterviewMode = Database["public"]["Enums"]["interview_mode"];
export type InterviewStatus = Database["public"]["Enums"]["interview_status"];

export type AdminInterviewRow = {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: InterviewMode;
  location: string | null;
  meeting_url: string | null;
  interviewer_name: string | null;
  notes: string | null;
  outcome: string | null;
  status: InterviewStatus;
  created_at: string;
  updated_at: string;
  teacher_name: string;
  teacher_email: string | null;
  job_title: string;
  school_name: string;
};

/** Fetch every interview joined to application -> teacher / job / school info. */
export async function fetchAdminInterviews(): Promise<AdminInterviewRow[]> {
  const { data: interviews, error } = await supabase
    .from("interviews")
    .select(
      "id,application_id,scheduled_at,duration_minutes,mode,location,meeting_url,interviewer_name,notes,outcome,status,created_at,updated_at",
    )
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  const rows = interviews ?? [];
  if (rows.length === 0) return [];

  const apps = await fetchAdminApplications();
  const appMap = new Map(apps.map((a) => [a.id, a]));

  return rows.map((i) => {
    const app = appMap.get(i.application_id);
    return {
      ...i,
      teacher_name: app?.teacher_name ?? "Candidate",
      teacher_email: app?.teacher_email ?? null,
      job_title: app?.job_title ?? "Vacancy",
      school_name: app?.school_name ?? "—",
    };
  });
}

export async function fetchSchedulableApplications(): Promise<AdminApplicationRow[]> {
  const apps = await fetchAdminApplications();
  return apps.filter((a) => a.status !== "rejected");
}

export async function createInterview(input: {
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: InterviewMode;
  location?: string | null;
  meeting_url?: string | null;
  interviewer_name?: string | null;
}) {
  const { error } = await supabase.from("interviews").insert({
    application_id: input.application_id,
    scheduled_at: input.scheduled_at,
    duration_minutes: input.duration_minutes,
    mode: input.mode,
    location: input.location ?? null,
    meeting_url: input.meeting_url ?? null,
    interviewer_name: input.interviewer_name ?? null,
    status: "scheduled",
  });
  if (error) throw error;
}

export async function rescheduleInterview(input: {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: InterviewMode;
  location?: string | null;
  meeting_url?: string | null;
  interviewer_name?: string | null;
}) {
  const { error } = await supabase
    .from("interviews")
    .update({
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes,
      mode: input.mode,
      location: input.location ?? null,
      meeting_url: input.meeting_url ?? null,
      interviewer_name: input.interviewer_name ?? null,
      status: "scheduled",
    })
    .eq("id", input.id);
  if (error) throw error;
}

export async function cancelInterview(id: string) {
  const { error } = await supabase.from("interviews").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}

export async function completeInterviewWithFeedback(input: { id: string; outcome: string; notes: string | null }) {
  const { error } = await supabase
    .from("interviews")
    .update({ status: "completed", outcome: input.outcome, notes: input.notes })
    .eq("id", input.id);
  if (error) throw error;
}

export const INTERVIEW_MODES: { value: InterviewMode; label: string }[] = [
  { value: "in_person", label: "In person" },
  { value: "video", label: "Video call" },
  { value: "phone", label: "Phone" },
];

export const INTERVIEW_STATUSES: { value: InterviewStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

export const OUTCOME_OPTIONS = [
  { value: "strong_yes", label: "Strong yes" },
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];
