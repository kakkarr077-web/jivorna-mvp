import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, LoadingSkeleton, EmptyState, InfoRow, StatusBadge } from "@/components/crm/CrmPrimitives";
import { Calendar } from "@/components/crm/Calendar";
import { RecruiterSelect, RecruiterLabel } from "@/components/crm/RecruiterSelect";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime, titleCase } from "@/lib/crm";
import {
  CALENDAR_EVENT_TYPES,
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  type AgendaEntry,
  type CalendarEventRow,
  type CalendarEventType,
} from "@/lib/calendar-events";
import { fetchAdminInterviews, type AdminInterviewRow } from "@/lib/admin-interviews";
import { fetchTasks, type TaskRow } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  component: AdminCalendar,
});

type KindFilter = { interview: boolean; event: boolean; task: boolean };

const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function interviewToEntry(i: AdminInterviewRow): AgendaEntry {
  return {
    id: `interview-${i.id}`,
    kind: "interview",
    title: `${i.teacher_name} · ${i.job_title}`,
    subtitle: i.school_name,
    at: i.scheduled_at,
    assigned_to: null,
    href: "/admin/interviews",
  };
}

function eventToEntry(e: CalendarEventRow): AgendaEntry {
  return {
    id: `event-${e.id}`,
    kind: "event",
    title: e.title,
    subtitle: titleCase(e.event_type),
    at: e.start_at,
    assigned_to: e.assigned_to,
  };
}

function taskToEntry(t: TaskRow): AgendaEntry {
  return {
    id: `task-${t.id}`,
    kind: "task",
    title: t.title,
    subtitle: titleCase(t.priority),
    at: t.due_at as string,
    assigned_to: t.assigned_to,
    href: "/admin/tasks",
  };
}

function AdminCalendar() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const interviewsQuery = useQuery({ queryKey: ["admin-interviews"], queryFn: fetchAdminInterviews });
  const eventsQuery = useQuery({ queryKey: ["calendar-events"], queryFn: fetchCalendarEvents });
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });

  const isLoading = interviewsQuery.isLoading || eventsQuery.isLoading || tasksQuery.isLoading;

  const [kindFilter, setKindFilter] = useState<KindFilter>({ interview: true, event: true, task: true });
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<Date | null>(null);
  const [selected, setSelected] = useState<AgendaEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const eventById = useMemo(() => {
    const map = new Map<string, CalendarEventRow>();
    for (const e of eventsQuery.data ?? []) map.set(e.id, e);
    return map;
  }, [eventsQuery.data]);

  const interviewById = useMemo(() => {
    const map = new Map<string, AdminInterviewRow>();
    for (const i of interviewsQuery.data ?? []) map.set(i.id, i);
    return map;
  }, [interviewsQuery.data]);

  const taskById = useMemo(() => {
    const map = new Map<string, TaskRow>();
    for (const t of tasksQuery.data ?? []) map.set(t.id, t);
    return map;
  }, [tasksQuery.data]);

  const entries = useMemo(() => {
    const list: AgendaEntry[] = [];
    if (kindFilter.interview) {
      for (const i of interviewsQuery.data ?? []) {
        if (i.status === "cancelled") continue;
        list.push(interviewToEntry(i));
      }
    }
    if (kindFilter.event) {
      for (const e of eventsQuery.data ?? []) {
        if (assigneeFilter && e.assigned_to !== assigneeFilter) continue;
        list.push(eventToEntry(e));
      }
    }
    if (kindFilter.task) {
      for (const t of tasksQuery.data ?? []) {
        if (t.status === "done" || !t.due_at) continue;
        if (assigneeFilter && t.assigned_to !== assigneeFilter) continue;
        list.push(taskToEntry(t));
      }
    }
    return list;
  }, [kindFilter, assigneeFilter, interviewsQuery.data, eventsQuery.data, tasksQuery.data]);

  const toggleKind = (k: keyof KindFilter) => setKindFilter((f) => ({ ...f, [k]: !f[k] }));

  const detailEvent = selected?.kind === "event" ? eventById.get(selected.id.replace("event-", "")) : undefined;
  const detailInterview =
    selected?.kind === "interview" ? interviewById.get(selected.id.replace("interview-", "")) : undefined;
  const detailTask = selected?.kind === "task" ? taskById.get(selected.id.replace("task-", "")) : undefined;

  const handleDeleteEvent = async () => {
    if (!detailEvent) return;
    setDeleteBusy(true);
    try {
      await deleteCalendarEvent(detailEvent.id);
      toast.success("Event deleted");
      await qc.invalidateQueries({ queryKey: ["calendar-events"] });
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Every interview, scheduled event and task due date in one place."
        action={
          <Button
            onClick={() => {
              setCreateDefaults(new Date());
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New event
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={kindFilter.interview} onCheckedChange={() => toggleKind("interview")} />
            Interviews
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={kindFilter.event} onCheckedChange={() => toggleKind("event")} />
            Events
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={kindFilter.task} onCheckedChange={() => toggleKind("task")} />
            Tasks
          </label>
        </div>
        <div className="ml-auto w-full sm:w-56">
          <RecruiterSelect value={assigneeFilter} onChange={setAssigneeFilter} placeholder="All assignees" />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="cards" rows={8} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No entries yet"
          description="Schedule an interview, create an event, or add a task with a due date."
          action={
            <Button
              onClick={() => {
                setCreateDefaults(new Date());
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New event
            </Button>
          }
        />
      ) : (
        <Calendar
          entries={entries}
          onSelectEntry={setSelected}
          onCreateAt={(date) => {
            setCreateDefaults(date);
            setCreateOpen(true);
          }}
        />
      )}

      <NewEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={createDefaults}
        userId={user?.id ?? null}
        onCreated={() => qc.invalidateQueries({ queryKey: ["calendar-events"] })}
      />

      <Sheet open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected && (
            <div>
              <SheetHeader>
                <SheetTitle className="font-serif">{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1">
                <InfoRow label="Kind" value={<StatusBadge label={titleCase(selected.kind)} />} />
                <InfoRow label="When" value={formatDateTime(selected.at)} />
                {selected.subtitle && <InfoRow label="Details" value={selected.subtitle} />}
                <InfoRow label="Assignee" value={<RecruiterLabel id={selected.assigned_to} />} />
                {detailEvent?.notes && <InfoRow label="Notes" value={detailEvent.notes} />}
                {detailInterview && <InfoRow label="Status" value={titleCase(detailInterview.status)} />}
                {detailTask && <InfoRow label="Status" value={titleCase(detailTask.status)} />}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {selected.href && (
                  <Link to={selected.href}>
                    <Button variant="outline">Open module</Button>
                  </Link>
                )}
                {selected.kind === "event" && detailEvent && (
                  <Button variant="ghost" className="text-destructive" onClick={handleDeleteEvent} disabled={deleteBusy}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete event
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NewEventDialog({
  open,
  onOpenChange,
  defaultDate,
  userId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: Date | null;
  userId: string | null;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarEventType>("meeting");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState<string | null>(userId);
  const [saving, setSaving] = useState(false);

  const resetAndClose = () => {
    setTitle("");
    setType("meeting");
    setStart("");
    setEnd("");
    setNotes("");
    setAssignee(userId);
    onOpenChange(false);
  };

  const effectiveStart = start || (defaultDate ? toLocalInputValue(defaultDate) : "");

  const handleSubmit = async () => {
    if (!title.trim() || !effectiveStart) {
      toast.error("Title and start time are required");
      return;
    }
    setSaving(true);
    try {
      await createCalendarEvent({
        title: title.trim(),
        event_type: type,
        start_at: new Date(effectiveStart).toISOString(),
        end_at: end ? new Date(end).toISOString() : null,
        notes: notes.trim() || null,
        assigned_to: assignee,
      });
      toast.success("Event created");
      onCreated();
      resetAndClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : resetAndClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">New event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call with school" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <RecruiterSelect value={assignee} onChange={setAssignee} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={effectiveStart}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end">End (optional)</Label>
              <Input id="event-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea id="event-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
