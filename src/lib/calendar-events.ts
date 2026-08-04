/** Unified recruitment calendar: interviews + manual events + task due dates. */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CalendarEventType = Database["public"]["Enums"]["calendar_event_type"];

export type CalendarEventRow = {
  id: string;
  title: string;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  related_type: string | null;
  related_id: string | null;
};

export const CALENDAR_EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "follow_up", label: "Follow up" },
  { value: "other", label: "Other" },
];

const SELECT = "id,title,event_type,start_at,end_at,notes,assigned_to,related_type,related_id";

export async function fetchCalendarEvents(): Promise<CalendarEventRow[]> {
  const { data, error } = await supabase.from("calendar_events").select(SELECT).order("start_at");
  if (error) throw error;
  return (data ?? []) as CalendarEventRow[];
}

export async function createCalendarEvent(input: {
  title: string;
  event_type: CalendarEventType;
  start_at: string;
  end_at?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  related_type?: string | null;
  related_id?: string | null;
}) {
  const { error } = await supabase.from("calendar_events").insert({
    title: input.title,
    event_type: input.event_type,
    start_at: input.start_at,
    end_at: input.end_at ?? null,
    notes: input.notes ?? null,
    assigned_to: input.assigned_to ?? null,
    related_type: input.related_type ?? null,
    related_id: input.related_id ?? null,
  });
  if (error) throw error;
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

/** A single normalised entry rendered by the calendar, whatever its source. */
export type AgendaEntry = {
  id: string;
  kind: "interview" | "event" | "task";
  title: string;
  subtitle?: string | undefined;
  at: string;
  assigned_to: string | null;
  href?: string | undefined;
};

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const startOfMonthGrid = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // Monday-first grid
  return start;
};

export const monthGridDays = (month: Date) => {
  const start = startOfMonthGrid(month);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

export const weekDays = (anchor: Date) => {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};
