import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, GripVertical, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BulkActionsToolbar,
  LoadingSkeleton,
  EmptyState,
} from "@/components/crm/CrmPrimitives";
import { DataTable, type DataTableColumn } from "@/components/crm/DataTable";
import { useCrmTable, useFacet, paginate } from "@/hooks/useCrmTable";
import { downloadCsvFile, formatDate, matchesTerm, toCsv } from "@/lib/crm";
import { PIPELINE_STAGES, normalizeStage, stageLabel, type StageId } from "@/lib/pipeline";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  APPLICATION_CSV_COLUMNS,
  fetchAdminApplications,
  groupByStage,
  updateApplicationStage,
  type AdminApplicationRow,
} from "@/lib/admin-applications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/applications/")({
  component: AdminApplications,
});

const ANY = "__any";

type Filters = { stage: string; school: string; job: string; from: string; to: string };

const initialFilters: Filters = { stage: ANY, school: ANY, job: ANY, from: "", to: "" };

function AdminApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: fetchAdminApplications,
  });

  const rows = data ?? [];

  const table = useCrmTable<Filters>(initialFilters, 10);
  const schools = useFacet(rows, (r) => r.school_name);
  const jobs = useFacet(rows, (r) => r.job_title);

  const filtered = useMemo(() => {
    const fromTs = table.filters.from ? new Date(table.filters.from).getTime() : null;
    const toTs = table.filters.to ? new Date(table.filters.to).getTime() + 86_400_000 : null;
    return rows.filter((r) => {
      if (table.filters.stage !== ANY && normalizeStage(r.status) !== table.filters.stage) return false;
      if (table.filters.school !== ANY && r.school_name !== table.filters.school) return false;
      if (table.filters.job !== ANY && r.job_title !== table.filters.job) return false;
      const created = new Date(r.created_at).getTime();
      if (fromTs !== null && created < fromTs) return false;
      if (toTs !== null && created >= toTs) return false;
      return matchesTerm(table.debouncedSearch, [r.teacher_name, r.teacher_email, r.job_title, r.school_name]);
    });
  }, [rows, table.filters, table.debouncedSearch]);

  const move = useMutation({
    mutationFn: async ({ row, to }: { row: AdminApplicationRow; to: StageId }) =>
      updateApplicationStage({ applicationId: row.id, from: row.status, to, actorId: user?.id }),
    onSuccess: () => {
      toast.success("Application moved.");
      void qc.invalidateQueries({ queryKey: ["admin-applications"] });
      void qc.invalidateQueries({ queryKey: ["application-events"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not move application"),
  });

  const bulkMove = useMutation({
    mutationFn: async ({ ids, to }: { ids: string[]; to: StageId }) => {
      const targets = rows.filter((r) => ids.includes(r.id));
      await Promise.all(
        targets.map((row) => updateApplicationStage({ applicationId: row.id, from: row.status, to, actorId: user?.id })),
      );
    },
    onSuccess: () => {
      toast.success("Applications updated.");
      table.setSelectedIds([]);
      void qc.invalidateQueries({ queryKey: ["admin-applications"] });
      void qc.invalidateQueries({ queryKey: ["application-events"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update applications"),
  });

  const metrics = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => !["rejected", "joined", "hired"].includes(normalizeStage(r.status))).length;
    const offers = rows.filter((r) => normalizeStage(r.status) === "offer").length;
    const joined = rows.filter((r) => ["joined"].includes(normalizeStage(r.status))).length;
    return { total, active, offers, joined };
  }, [rows]);

  const exportCsv = () => downloadCsvFile("applications.csv", toCsv(APPLICATION_CSV_COLUMNS, filtered));

  const columns: DataTableColumn<AdminApplicationRow>[] = [
    {
      id: "candidate",
      header: "Candidate",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.teacher_name}</p>
          <p className="truncate text-xs text-muted-foreground">{r.teacher_email ?? "—"}</p>
        </div>
      ),
      sortValue: (r) => r.teacher_name,
    },
    { id: "job", header: "Job", cell: (r) => r.job_title, sortValue: (r) => r.job_title },
    { id: "school", header: "School", cell: (r) => r.school_name, sortValue: (r) => r.school_name },
    {
      id: "stage",
      header: "Stage",
      cell: (r) => <StatusBadge label={stageLabel(r.status)} />,
      sortValue: (r) => stageLabel(r.status),
    },
    { id: "created", header: "Applied on", cell: (r) => formatDate(r.created_at), sortValue: (r) => r.created_at },
    { id: "updated", header: "Last updated", cell: (r) => formatDate(r.updated_at), sortValue: (r) => r.updated_at },
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

  return (
    <div>
      <PageHeader title="Applications" description="Track every candidate application across schools and vacancies." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total applications" value={metrics.total} icon={Send} />
        <MetricCard label="Active in pipeline" value={metrics.active} tone="gold" />
        <MetricCard label="Offers extended" value={metrics.offers} />
        <MetricCard label="Joined" value={metrics.joined} />
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-5">
          {isLoading ? (
            <LoadingSkeleton variant="cards" rows={8} />
          ) : rows.length === 0 ? (
            <EmptyState title="No applications yet" description="Applications will appear here once candidates apply." />
          ) : (
            <KanbanBoard rows={rows} onMove={(row, to) => move.mutate({ row, to })} onOpen={(id) => navigate({ to: "/admin/applications/$applicationId", params: { applicationId: id } })} />
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-5">
          <FilterToolbar
            onReset={table.reset}
            right={
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            }
          >
            <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search candidate, job, school…" />
            <Select value={table.filters.stage} onValueChange={(v) => table.setFilter("stage", v)}>
              <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All stages</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={table.filters.school} onValueChange={(v) => table.setFilter("school", v)}>
              <SelectTrigger><SelectValue placeholder="School" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All schools</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={table.filters.job} onValueChange={(v) => table.setFilter("job", v)}>
              <SelectTrigger><SelectValue placeholder="Job" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All jobs</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j} value={j}>{j}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="date"
              value={table.filters.from}
              onChange={(e) => table.setFilter("from", e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
            <input
              type="date"
              value={table.filters.to}
              onChange={(e) => table.setFilter("to", e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </FilterToolbar>

          <BulkActionsToolbar count={table.selectedIds.length} onClear={() => table.setSelectedIds([])}>
            <Select onValueChange={(v) => bulkMove.mutate({ ids: table.selectedIds, to: v as StageId })}>
              <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Move to stage…" /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BulkActionsToolbar>

          <DataTable
            rows={pageRows}
            columns={columns}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            onRowClick={(r) => navigate({ to: "/admin/applications/$applicationId", params: { applicationId: r.id } })}
            sort={table.sort}
            onSortChange={table.setSort}
            selectedIds={table.selectedIds}
            onSelectionChange={table.setSelectedIds}
            page={table.page}
            pageSize={table.pageSize}
            totalCount={filtered.length}
            onPageChange={table.setPage}
            emptyTitle="No applications match"
            emptyDescription="Try adjusting your filters or search term."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KanbanBoard({
  rows,
  onMove,
  onOpen,
}: {
  rows: AdminApplicationRow[];
  onMove: (row: AdminApplicationRow, to: StageId) => void;
  onOpen: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);
  const columns = useMemo(() => groupByStage(rows), [rows]);

  const drop = (stage: StageId) => {
    const row = rows.find((r) => r.id === dragId);
    setDragId(null);
    setOverStage(null);
    if (row) onMove(row, stage);
  };

  return (
    <div className="-mx-1 overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4 px-1">
        {PIPELINE_STAGES.map((stage) => {
          const cards = columns.get(stage.id) ?? [];
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.id);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={() => drop(stage.id)}
              className={cn(
                "flex w-72 flex-col rounded-2xl border border-border bg-secondary/50 p-3 transition-colors",
                overStage === stage.id && "border-gold bg-gold/10",
              )}
            >
              <header className="flex items-center justify-between px-1 pb-3">
                <h2 className="font-serif text-sm tracking-wide">{stage.label}</h2>
                <Badge variant="secondary">{cards.length}</Badge>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {cards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => onOpen(card.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border border-border bg-card p-3 shadow-soft transition-shadow hover:shadow-md",
                      dragId === card.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">{card.teacher_name}</p>
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{card.job_title}</p>
                    <p className="truncate text-xs text-muted-foreground">{card.school_name}</p>
                  </article>
                ))}
                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    No candidates
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
