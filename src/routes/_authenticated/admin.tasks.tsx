import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PageHeader,
  MetricCard,
  StatusBadge,
  SearchInput,
  FilterToolbar,
  ConfirmDialog,
  LoadingSkeleton,
} from "@/components/crm/CrmPrimitives";
import { DataTable, type DataTableColumn } from "@/components/crm/DataTable";
import { useCrmTable, paginate } from "@/hooks/useCrmTable";
import { RecruiterSelect, RecruiterLabel } from "@/components/crm/RecruiterSelect";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, matchesTerm, titleCase } from "@/lib/crm";
import { cn } from "@/lib/utils";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  createTask,
  deleteTask,
  fetchTasks,
  isDueToday,
  isOverdue,
  taskPriorityTone,
  updateTask,
  type TaskRow,
  type TaskStatus,
} from "@/lib/tasks";
import { TaskDialog, type TaskFormValues } from "@/components/admin/TaskDialogs";

export const Route = createFileRoute("/_authenticated/admin/tasks")({
  component: AdminTasks,
});

const ANY = "__any";
type Filters = { status: string; priority: string; assignee: string };
const initialFilters: Filters = { status: ANY, priority: ANY, assignee: ANY };


const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function AdminTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const table = useCrmTable<Filters>(initialFilters, 10);

  const { data, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const rows = data ?? [];

  const [view, setView] = useState<"table" | "board">("table");
  const [myOnly, setMyOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TaskRow | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["tasks"] });

  const createMutation = useMutation({
    mutationFn: (values: TaskFormValues) => createTask({ ...values, created_by: user?.id ?? null }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success("Task created.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create task"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TaskFormValues> }) => updateTask(id, patch),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update task"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      invalidate();
      toast.success("Task deleted.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete task"),
  });

  const metrics = useMemo(() => {
    const overdue = rows.filter(isOverdue).length;
    const dueToday = rows.filter(isDueToday).length;
    const inProgress = rows.filter((t) => t.status === "in_progress").length;
    const weekStart = startOfWeek();
    const completedThisWeek = rows.filter(
      (t) => t.status === "done" && t.completed_at && new Date(t.completed_at) >= weekStart,
    ).length;
    return { overdue, dueToday, inProgress, completedThisWeek };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((t) => {
      if (myOnly && t.assigned_to !== user?.id) return false;
      if (table.filters.status !== ANY && t.status !== table.filters.status) return false;
      if (table.filters.priority !== ANY && t.priority !== table.filters.priority) return false;
      if (table.filters.assignee !== ANY && t.assigned_to !== table.filters.assignee) return false;
      return matchesTerm(table.debouncedSearch, [t.title, t.description, t.related_type, t.related_id]);
    });
  }, [rows, myOnly, user, table.filters, table.debouncedSearch]);

  const { pageRows, pageCount } = paginate(filtered, table.page, table.pageSize);

  const columns: DataTableColumn<TaskRow>[] = [
    {
      id: "title",
      header: "Title",
      sortValue: (r) => r.title,
      cell: (r) => (
        <div className="flex items-start gap-2">
          <Checkbox
            checked={r.status === "done"}
            onCheckedChange={(v) =>
              updateMutation.mutate({ id: r.id, patch: { status: v ? "done" : "todo" } })
            }
          />
          <div className="min-w-0">
            <p className={cn("truncate text-sm font-medium", r.status === "done" && "text-muted-foreground line-through")}>
              {r.title}
            </p>
            {isOverdue(r) && <p className="text-xs text-destructive">Overdue</p>}
            {!isOverdue(r) && isDueToday(r) && <p className="text-xs text-gold">Due today</p>}
          </div>
        </div>
      ),
    },
    {
      id: "related",
      header: "Related to",
      cell: (r) =>
        r.related_type ? (
          <span className="text-sm text-muted-foreground">
            {titleCase(r.related_type)} · {r.related_id?.slice(0, 8) ?? "—"}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: (r) => <RecruiterLabel id={r.assigned_to} />,
    },
    {
      id: "priority",
      header: "Priority",
      sortValue: (r) => r.priority,
      cell: (r) => <StatusBadge label={titleCase(r.priority)} tone={taskPriorityTone(r.priority)} />,
    },
    {
      id: "due",
      header: "Due date",
      sortValue: (r) => (r.due_at ? new Date(r.due_at).getTime() : 0),
      cell: (r) => <span className="text-sm">{formatDate(r.due_at)}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge label={titleCase(r.status)} tone={r.status === "done" ? "secondary" : "outline"} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(r);
              setDialogOpen(true);
            }}
          >
            Edit
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => setPendingDelete(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const board = useMemo(() => {
    const map = new Map<TaskStatus, TaskRow[]>(COLUMNS.map((c) => [c.id, []]));
    for (const t of filtered) map.get(t.status)?.push(t);
    return map;
  }, [filtered]);

  const drop = (status: TaskStatus) => {
    const task = filtered.find((t) => t.id === dragId);
    setDragId(null);
    setOverStatus(null);
    if (task && task.status !== status) updateMutation.mutate({ id: task.id, patch: { status } });
  };

  return (
    <div>
      <PageHeader
        title="Task management"
        description="Track internal follow-ups across recruitment, schools and teachers."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            New task
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Overdue" value={metrics.overdue} icon={AlertTriangle} tone="gold" />
        <MetricCard label="Due today" value={metrics.dueToday} icon={CalendarClock} />
        <MetricCard label="In progress" value={metrics.inProgress} icon={ListTodo} />
        <MetricCard label="Completed this week" value={metrics.completedThisWeek} icon={CheckCircle2} />
      </div>

      <FilterToolbar
        onReset={() => {
          table.reset();
          setMyOnly(false);
        }}
        right={
          <Button
            variant={myOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setMyOnly((v) => !v)}
            disabled={!user}
          >
            My tasks
          </Button>
        }
      >
        <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search tasks…" />
        <Select value={table.filters.status} onValueChange={(v) => table.setFilter("status", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={table.filters.priority} onValueChange={(v) => table.setFilter("priority", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any priority</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RecruiterSelect
          value={table.filters.assignee === ANY ? null : table.filters.assignee}
          onChange={(v) => table.setFilter("assignee", v ?? ANY)}
          includeUnassigned={false}
          placeholder="Assignee"
        />
      </FilterToolbar>

      <Tabs value={view} onValueChange={(v) => setView(v as "table" | "board")}>
        <TabsList className="mb-4">
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <DataTable
            rows={pageRows}
            columns={columns}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            sort={table.sort}
            onSortChange={table.setSort}
            page={table.page}
            pageSize={table.pageSize}
            totalCount={filtered.length}
            onPageChange={table.setPage}
            emptyTitle="No tasks found"
            emptyDescription="Adjust your filters or create a new task."
          />
        </TabsContent>

        <TabsContent value="board">
          {isLoading ? (
            <LoadingSkeleton variant="cards" />
          ) : (
            <div className="-mx-1 overflow-x-auto pb-4">
              <div className="flex min-w-max gap-4 px-1">
                {COLUMNS.map((col) => {
                  const cards = board.get(col.id) ?? [];
                  return (
                    <section
                      key={col.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOverStatus(col.id);
                      }}
                      onDragLeave={() => setOverStatus((s) => (s === col.id ? null : s))}
                      onDrop={() => drop(col.id)}
                      className={cn(
                        "flex w-72 flex-col rounded-2xl border border-border bg-secondary/50 p-3 transition-colors",
                        overStatus === col.id && "border-gold bg-gold/10",
                      )}
                    >
                      <header className="flex items-center justify-between px-1 pb-3">
                        <h2 className="font-serif text-sm tracking-wide">{col.label}</h2>
                        <StatusBadge label={String(cards.length)} tone="secondary" />
                      </header>
                      <div className="flex flex-1 flex-col gap-2">
                        {cards.map((t) => (
                          <article
                            key={t.id}
                            draggable
                            onDragStart={() => setDragId(t.id)}
                            onDragEnd={() => setDragId(null)}
                            onClick={() => {
                              setEditing(t);
                              setDialogOpen(true);
                            }}
                            className={cn(
                              "cursor-pointer rounded-xl border border-border bg-card p-3 shadow-soft transition-shadow hover:shadow-md",
                              dragId === t.id && "opacity-50",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <Checkbox
                                checked={t.status === "done"}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={(v) =>
                                  updateMutation.mutate({ id: t.id, patch: { status: v ? "done" : "todo" } })
                                }
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{t.title}</p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <StatusBadge label={titleCase(t.priority)} tone={taskPriorityTone(t.priority)} />
                                  <span className="text-[11px] text-muted-foreground">{formatDate(t.due_at)}</span>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                        {cards.length === 0 && (
                          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                            Drop tasks here
                          </p>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        task={editing}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) updateMutation.mutate({ id: editing.id, patch: values });
          else createMutation.mutate(values);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete this task?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
