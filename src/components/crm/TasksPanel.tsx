import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog, InfoCard, StatusBadge } from "@/components/crm/CrmPrimitives";
import { RecruiterSelect, RecruiterLabel } from "@/components/crm/RecruiterSelect";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/crm";
import { cn } from "@/lib/utils";
import {
  TASK_PRIORITIES,
  createTask,
  deleteTask,
  fetchTasksFor,
  isOverdue,
  taskPriorityTone,
  updateTask,
  type TaskPriority,
  type TaskRelatedType,
} from "@/lib/tasks";

/** Compact tasks widget embeddable on any CRM entity page. */
export function TasksPanel({
  relatedType,
  relatedId,
  title = "Tasks",
}: {
  relatedType: TaskRelatedType;
  relatedId: string;
  title?: string | undefined;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["tasks-for", relatedType, relatedId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTasksFor(relatedType, relatedId),
  });

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [draftPriority, setDraftPriority] = useState<TaskPriority>("medium");
  const [draftAssignee, setDraftAssignee] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey });

  const add = useMutation({
    mutationFn: () =>
      createTask({
        title: draftTitle.trim(),
        priority: draftPriority,
        due_at: draftDue ? new Date(draftDue).toISOString() : null,
        assigned_to: draftAssignee,
        related_type: relatedType,
        related_id: relatedId,
        created_by: user?.id ?? null,
      }),
    onSuccess: () => {
      setDraftTitle("");
      setDraftDue("");
      setDraftPriority("medium");
      setDraftAssignee(null);
      invalidate();
      toast.success("Task added.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add task"),
  });

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateTask(id, { status: done ? "done" : "todo" }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update task"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      invalidate();
      toast.success("Task deleted.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete task"),
  });

  const rows = data ?? [];

  return (
    <InfoCard title={title} description="Follow-ups linked to this record.">
      <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
        <Input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Add a task…"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Input type="datetime-local" value={draftDue} onChange={(e) => setDraftDue(e.target.value)} />
          <Select value={draftPriority} onValueChange={(v) => setDraftPriority(v as TaskPriority)}>
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
          <RecruiterSelect value={draftAssignee} onChange={setDraftAssignee} className="col-span-2 sm:col-span-1" />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => void add.mutate()}
            disabled={!draftTitle.trim() || add.isPending}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add task
          </Button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {!isLoading && rows.length === 0 && (
          <li className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No tasks yet.
          </li>
        )}
        {rows.map((t) => (
          <li
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border bg-surface p-3",
              isOverdue(t) && "border-destructive/40",
            )}
          >
            <Checkbox
              checked={t.status === "done"}
              onCheckedChange={(v) => toggleDone.mutate({ id: t.id, done: Boolean(v) })}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium", t.status === "done" && "text-muted-foreground line-through")}>
                {t.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge label={t.priority} tone={taskPriorityTone(t.priority)} />
                {t.due_at && <span>{formatDate(t.due_at)}</span>}
                <RecruiterLabel id={t.assigned_to} />
              </div>
            </div>
            <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => setPendingDelete(t.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete this task?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </InfoCard>
  );
}
