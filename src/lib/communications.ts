/** Shared communication / activity log used by every CRM entity. */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Phone,
  Mail,
  Users,
  MessageCircle,
  StickyNote,
  ArrowRightLeft,
  CalendarClock,
  Award,
  Activity,
  type LucideIcon,
} from "lucide-react";

export type CommEntityType = "school" | "teacher" | "job" | "lead" | "application" | "interview";
export type CommChannel = Database["public"]["Enums"]["comm_channel"];

export type CommunicationRow = {
  id: string;
  entity_type: CommEntityType;
  entity_id: string;
  channel: CommChannel;
  summary: string;
  body: string | null;
  occurred_at: string;
  recruiter_id: string | null;
  attachment_url: string | null;
  created_at: string;
};

export const COMM_CHANNELS: { value: CommChannel; label: string; icon: LucideIcon }[] = [
  { value: "call", label: "Phone call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "note", label: "Internal note", icon: StickyNote },
  { value: "status_change", label: "Status change", icon: ArrowRightLeft },
  { value: "interview", label: "Interview", icon: CalendarClock },
  { value: "offer", label: "Offer", icon: Award },
  { value: "system", label: "System", icon: Activity },
];

/** Channels a recruiter can log by hand — system entries are written by the database. */
export const LOGGABLE_CHANNELS = COMM_CHANNELS.filter(
  (c) => !["status_change", "system", "interview", "offer"].includes(c.value),
);

export const channelMeta = (channel: CommChannel) =>
  COMM_CHANNELS.find((c) => c.value === channel) ?? COMM_CHANNELS[COMM_CHANNELS.length - 1]!;

export async function fetchCommunications(
  entityType: CommEntityType,
  entityId: string,
): Promise<CommunicationRow[]> {
  const { data, error } = await supabase
    .from("communications")
    .select("id,entity_type,entity_id,channel,summary,body,occurred_at,recruiter_id,attachment_url,created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommunicationRow[];
}

/** Most recent entries across every entity — powers dashboards and the activity feed. */
export async function fetchRecentCommunications(limit = 50): Promise<CommunicationRow[]> {
  const { data, error } = await supabase
    .from("communications")
    .select("id,entity_type,entity_id,channel,summary,body,occurred_at,recruiter_id,attachment_url,created_at")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CommunicationRow[];
}

export async function logCommunication(input: {
  entityType: CommEntityType;
  entityId: string;
  channel: CommChannel;
  summary: string;
  body?: string | null;
  occurredAt?: string;
  recruiterId?: string | null;
  attachmentUrl?: string | null;
}) {
  const { error } = await supabase.from("communications").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    channel: input.channel,
    summary: input.summary,
    body: input.body ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    recruiter_id: input.recruiterId ?? null,
    attachment_url: input.attachmentUrl ?? null,
  });
  if (error) throw error;
}

export async function deleteCommunication(id: string) {
  const { error } = await supabase.from("communications").delete().eq("id", id);
  if (error) throw error;
}
