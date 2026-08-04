/** Internal task management shared by the workspace, calendar and entity pages. */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskRelatedType = "school" | "teacher" | "job" | "lead" | "application" | "interview";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
};

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const taskPriorityTone = (p: TaskPriority): "default" | "secondary" | "outline" | "destructive" =>
  p === "urgent" ? "destructive" : p === "high" ? "default" : p === "medium" ? "secondary" : "outline";

const SELECT =
  "id,title,description,status,priority,due_at,completed_at,assigned_to,created_by,related_type,related_id,created_at,updated_at";

export async function fetchTasks(): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export async function fetchTasksFor(relatedType: TaskRelatedType, relatedId: string): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .eq("related_type", relatedType)
    .eq("related_id", relatedId)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export type TaskInput = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  assigned_to?: string | null;
  related_type?: string | null;
  related_id?: string | null;
};

export async function createTask(input: TaskInput & { created_by: string | null }) {
  const { error } = await supabase.from("tasks").insert({
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    due_at: input.due_at ?? null,
    assigned_to: input.assigned_to ?? null,
    related_type: input.related_type ?? null,
    related_id: input.related_id ?? null,
    created_by: input.created_by,
  });
  if (error) throw error;
}

export async function updateTask(id: string, patch: Partial<TaskInput>) {
  const completed = patch.status
    ? { completed_at: patch.status === "done" ? new Date().toISOString() : null }
    : {};
  const { error } = await supabase
    .from("tasks")
    .update({ ...patch, ...completed })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isOverdue = (t: TaskRow) =>
  t.status !== "done" && !!t.due_at && new Date(t.due_at).getTime() < startOfToday().getTime();

export const isDueToday = (t: TaskRow) => {
  if (t.status === "done" || !t.due_at) return false;
  const due = new Date(t.due_at);
  const today = startOfToday();
  return due >= today && due.getTime() < today.getTime() + 86_400_000;
};
