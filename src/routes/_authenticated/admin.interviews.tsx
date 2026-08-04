import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Plus, Video, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  MetricCard,
  StatusBadge,
  SearchInput,
  FilterToolbar,
  LoadingSkeleton,
  EmptyState,
  SectionHeader,
} from "@/components/crm/CrmPrimitives";
import { DataTable, type DataTableColumn } from "@/components/crm/DataTable";
import { useCrmTable, paginate } from "@/hooks/useCrmTable";
import { formatDateTime, matchesTerm } from "@/lib/crm";
import { cn } from "@/lib/utils";
import {
  INTERVIEW_MODES,
  INTERVIEW_STATUSES,
  fetchAdminInterviews,
  type AdminInterviewRow,
} from "@/lib/admin-interviews";
import {
  CancelInterviewDialog,
  CompleteInterviewDialog,
  ScheduleInterviewDialog,
} from "@/components/admin/InterviewDialogs";

export const Route = createFileRoute("/_authenticated/admin/interviews")({
  component: AdminInterviews,
});

const ANY = "__any";

type Filters = { status: string; mode: string; from: string; to: string };
const initialFilters: Filters = { status: ANY, mode: ANY, from: "", to: "" };

function AdminInterviews() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-interviews"], queryFn: fetchAdminInterviews });
  const rows = data ?? [];

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AdminInterviewRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminInterviewRow | null>(null);
  const [completeTarget, setCompleteTarget] = useState<AdminInterviewRow | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const table = useCrmTable<Filters>(initialFilters, 10);

  const metrics = useMemo(() => {
    const now = new Date();
    const today = rows.filter((r) => isSameDay(new Date(r.scheduled_at), now) && r.status !== "cancelled").length;
    const upcoming = rows.filter((r) => new Date(r.scheduled_at) > now && r.status === "scheduled").length;
    const completed = rows.filter((r) => r.status === "completed").length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    return { today, upcoming, completed, cancelled };
  }, [rows]);

  const filtered = useMemo(() => {
    const fromTs = table.filters.from ? new Date(table.filters.from).getTime() : null;
    const toTs = table.filters.to ? new Date(table.filters.to).getTime() + 86_400_000 : null;
    return rows.filter((r) => {
      if (table.filters.status !== ANY && r.status !== table.filters.status) return false;
      if (table.filters.mode !== ANY && r.mode !== table.filters.mode) return false;
      const at = new Date(r.scheduled_at).getTime();
      if (fromTs !== null && at < fromTs) return false;
      if (toTs !== null && at >= toTs) return false;
      return matchesTerm(table.debouncedSearch, [r.teacher_name, r.job_title, r.school_name, r.interviewer_name]);
    });
  }, [rows, table.filters, table.debouncedSearch]);

  const columns: DataTableColumn<AdminInterviewRow>[] = [
    { id: "candidate", header: "Candidate", cell: (r) => r.teacher_name, sortValue: (r) => r.teacher_name },
    { id: "job", header: "Job", cell: (r) => r.job_title, sortValue: (r) => r.job_title },
    { id: "school", header: "School", cell: (r) => r.school_name, sortValue: (r) => r.school_name },
    { id: "when", header: "Date & time", cell: (r) => formatDateTime(r.scheduled_at), sortValue: (r) => r.scheduled_at },
    { id: "mode", header: "Mode", cell: (r) => INTERVIEW_MODES.find((m) => m.value === r.mode)?.label ?? r.mode },
    { id: "interviewer", header: "Interviewer", cell: (r) => r.interviewer_name ?? "—" },
    {
      id: "link",
      header: "Meeting link",
      cell: (r) =>
        r.meeting_url ? (
          <a href={r.meeting_url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
            Join
          </a>
        ) : (
          r.location ?? "—"
        ),
    },
    { id: "status", header: "Status", cell: (r) => <StatusBadge label={INTERVIEW_STATUSES.find((s) => s.value === r.status)?.label ?? r.status} />, sortValue: (r) => r.status },
    {
      id: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {r.status !== "cancelled" && r.status !== "completed" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setRescheduleTarget(r)}>Reschedule</Button>
              <Button size="sm" variant="outline" onClick={() => setCompleteTarget(r)}>Complete</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelTarget(r)}>Cancel</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const { pageRows } = paginate(
    (() => {
      let s = [...filtered];
      if (table.sort) {
        const col = columns.find((c) => c.id === table.sort!.id);
        if (col?.sortValue) {
          const factor = table.sort.dir === "asc" ? 1 : -1;
          s = s.sort((a, b) => String(col.sortValue!(a)).localeCompare(String(col.sortValue!(b))) * factor);
        }
      }
      return s;
    })(),
    table.page,
    table.pageSize,
  );

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth));
    const end = endOfWeek(endOfMonth(calendarMonth));
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, AdminInterviewRow[]>();
    for (const r of rows) {
      const key = format(new Date(r.scheduled_at), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
  }, [rows]);

  const upcomingList = useMemo(
    () => rows.filter((r) => new Date(r.scheduled_at) >= new Date() && r.status !== "cancelled").sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()).slice(0, 8),
    [rows],
  );
  const historyList = useMemo(
    () => rows.filter((r) => r.status === "completed" || r.status === "cancelled" || new Date(r.scheduled_at) < new Date()).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).slice(0, 8),
    [rows],
  );

  return (
    <div>
      <PageHeader
        title="Interviews"
        description="Schedule, reschedule and track interview outcomes across every candidate."
        action={
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Schedule interview
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Today" value={metrics.today} icon={CalendarClock} />
        <MetricCard label="Upcoming" value={metrics.upcoming} tone="gold" icon={Video} />
        <MetricCard label="Completed" value={metrics.completed} icon={CheckCircle2} />
        <MetricCard label="Cancelled" value={metrics.cancelled} icon={XCircle} />
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-5">
          {isLoading ? (
            <LoadingSkeleton variant="cards" rows={8} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-lg">{format(calendarMonth, "MMMM yyyy")}</h2>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setCalendarMonth((m) => subMonths(m, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setCalendarMonth((m) => addMonths(m, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const dayInterviews = interviewsByDay.get(key) ?? [];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "min-h-16 rounded-lg border border-border p-1.5 text-left text-xs transition-colors hover:border-primary/40",
                          !isSameMonth(day, calendarMonth) && "opacity-40",
                          isToday(day) && "border-gold bg-gold/10",
                          selectedDay && isSameDay(day, selectedDay) && "ring-2 ring-primary",
                        )}
                      >
                        <span className="font-medium">{format(day, "d")}</span>
                        {dayInterviews.length > 0 && (
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-[10px]">{dayInterviews.length}</Badge>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="mb-3 font-serif text-sm">
                  {selectedDay ? format(selectedDay, "d MMM yyyy") : "Select a day"}
                </h3>
                {!selectedDay ? (
                  <p className="text-sm text-muted-foreground">Click a date to see its interviews.</p>
                ) : (
                  (() => {
                    const list = interviewsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
                    if (list.length === 0) return <p className="text-sm text-muted-foreground">No interviews on this day.</p>;
                    return (
                      <ul className="space-y-3">
                        {list.map((i) => (
                          <li key={i.id} className="rounded-lg border border-border p-3">
                            <p className="text-sm font-medium">{i.teacher_name}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(i.scheduled_at), "p")} · {i.job_title}</p>
                            <div className="mt-2 flex gap-2">
                              <StatusBadge label={INTERVIEW_STATUSES.find((s) => s.value === i.status)?.label ?? i.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <SectionHeader title="Upcoming interviews" />
              {upcomingList.length === 0 ? (
                <EmptyState title="No upcoming interviews" description="Scheduled interviews will show up here." />
              ) : (
                <ul className="space-y-2">
                  {upcomingList.map((i) => (
                    <li key={i.id} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-medium">{i.teacher_name} · {i.job_title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(i.scheduled_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <SectionHeader title="Interview history" />
              {historyList.length === 0 ? (
                <EmptyState title="No interview history yet" description="Past interviews will show up here." />
              ) : (
                <ul className="space-y-2">
                  {historyList.map((i) => (
                    <li key={i.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{i.teacher_name} · {i.job_title}</p>
                        <StatusBadge label={INTERVIEW_STATUSES.find((s) => s.value === i.status)?.label ?? i.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDateTime(i.scheduled_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-5">
          <FilterToolbar onReset={table.reset}>
            <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search candidate, job, interviewer…" />
            <Select value={table.filters.status} onValueChange={(v) => table.setFilter("status", v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All statuses</SelectItem>
                {INTERVIEW_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={table.filters.mode} onValueChange={(v) => table.setFilter("mode", v)}>
              <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All modes</SelectItem>
                {INTERVIEW_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="date" value={table.filters.from} onChange={(e) => table.setFilter("from", e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
            <input type="date" value={table.filters.to} onChange={(e) => table.setFilter("to", e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
          </FilterToolbar>

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
            emptyTitle="No interviews match"
            emptyDescription="Try adjusting your filters or search term."
          />
        </TabsContent>
      </Tabs>

      <ScheduleInterviewDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <ScheduleInterviewDialog open={rescheduleTarget !== null} onOpenChange={(v) => !v && setRescheduleTarget(null)} interview={rescheduleTarget} />
      <CancelInterviewDialog interview={cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)} />
      <CompleteInterviewDialog interview={completeTarget} onOpenChange={(v) => !v && setCompleteTarget(null)} />
    </div>
  );
}
