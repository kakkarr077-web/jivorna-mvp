import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecruiterSelect } from "@/components/crm/RecruiterSelect";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskInput, type TaskRelatedType, type TaskRow } from "@/lib/tasks";

const RELATED_TYPES: { value: TaskRelatedType; label: string }[] = [
  { value: "school", label: "School" },
  { value: "teacher", label: "Teacher" },
  { value: "job", label: "Job" },
  { value: "lead", label: "Lead" },
  { value: "application", label: "Application" },
  { value: "interview", label: "Interview" },
];

const NONE = "__none";

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export type TaskFormValues = TaskInput;

const emptyForm: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_at: null,
  assigned_to: null,
  related_type: null,
  related_id: null,
};

function fromRow(row: TaskRow): TaskFormValues {
  return {
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    due_at: row.due_at,
    assigned_to: row.assigned_to,
    related_type: row.related_type,
    related_id: row.related_id,
  };
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: TaskRow | null | undefined;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  isSaving?: boolean | undefined;
}) {
  const [form, setForm] = useState<TaskFormValues>(emptyForm);

  useEffect(() => {
    if (open) setForm(task ? fromRow(task) : emptyForm);
  }, [open, task]);

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) return;
    await onSubmit({
      ...form,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>Track work items and assign them to a recruiter.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority ?? "medium"} onValueChange={(v) => set("priority", v as TaskFormValues["priority"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status ?? "todo"} onValueChange={(v) => set("status", v as TaskFormValues["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={form.due_at ? toLocalInput(form.due_at) : ""}
                onChange={(e) => set("due_at", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <RecruiterSelect value={form.assigned_to ?? null} onChange={(v) => set("assigned_to", v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Related to</Label>
              <Select
                value={form.related_type ?? NONE}
                onValueChange={(v) => set("related_type", v === NONE ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {RELATED_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-related-id">Record ID</Label>
              <Input
                id="task-related-id"
                value={form.related_id ?? ""}
                onChange={(e) => set("related_id", e.target.value || null)}
                placeholder="Optional"
                disabled={!form.related_type}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!form.title.trim() || isSaving}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
