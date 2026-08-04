import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Download, Send, UserCheck, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { RecruiterLabel, RecruiterSelect } from "@/components/crm/RecruiterSelect";
import { ApplicationsKanban } from "@/components/admin/ApplicationsKanban";
import { SavedViewsBar } from "@/components/admin/SavedViewsBar";
import { useCrmTable, useFacet, paginate } from "@/hooks/useCrmTable";
import { downloadCsvFile, formatDate, formatMoney, matchesTerm, toCsv } from "@/lib/crm";
import { ATS_STAGES, atsStage, atsStageLabel, atsStageTone, type AtsStageId } from "@/lib/ats";
import { fetchRecruiters } from "@/lib/recruiters";
import { useAuth } from "@/hooks/useAuth";
import {
  APPLICATION_CSV_COLUMNS,
  bulkAssignRecruiter,
  bulkArchive,
  bulkReject,
  bulkUpdateStage,
  fetchAdminApplications,
  updateApplicationStage,
  type AdminApplicationRow,
} from "@/lib/admin-applications";

export const Route = createFileRoute("/_authenticated/admin/applications/")({
  component: AdminApplications,
});

const ANY = "__any";

type Filters = {
  stage: string;
  school: string;
  job: string;
  recruiter: string;
  from: string;
  to: string;
  archived: string;
};

const initialFilters: Filters = {
  stage: ANY,
  school: ANY,
  job: ANY,
  recruiter: ANY,
  from: "",
  to: "",
  archived: "false",
};

function AdminApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: fetchAdminApplications,
  });
  const { data: recruiters } = useQuery({ queryKey: ["recruiters"], queryFn: fetchRecruiters });

  const rows = data ?? [];
  const allRecruiters = recruiters ?? [];

  const table = useCrmTable<Filters>(initialFilters, 10);
  const schools = useFacet(rows, (r) => r.school_name);
  const jobs = useFacet(rows, (r) => r.job_title);

  const showArchived = table.filters.archived === "true";

  const filtered = useMemo(() => {
    const fromTs = table.filters.from ? new Date(table.filters.from).getTime() : null;
    const toTs = table.filters.to ? new Date(table.filters.to).getTime() + 86_400_000 : null;
    return rows.filter((r) => {
      if (Boolean(r.archived) !== showArchived) return false;
      if (table.filters.stage !== ANY && atsStage(r.status) !== table.filters.stage) return false;
      if (table.filters.school !== ANY && r.school_name !== table.filters.school) return false;
      if (table.filters.job !== ANY && r.job_title !== table.filters.job) return false;
      if (table.filters.recruiter !== ANY) {
        if (table.filters.recruiter === "__unassigned") {
          if (r.assigned_recruiter) return false;
        } else if (r.assigned_recruiter !== table.filters.recruiter) return false;
      }
      const created = new Date(r.created_at).getTime();
      if (fromTs !== null && created < fromTs) return false;
      if (toTs !== null && created >= toTs) return false;
      return matchesTerm(table.debouncedSearch, [r.teacher_name, r.teacher_email, r.job_title, r.school_name]);
    });
  }, [rows, table.filters, table.debouncedSearch, showArchived]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-applications"] });
    void qc.invalidateQueries({ queryKey: ["application-events"] });
  };

  const move = useMutation({
    mutationFn: async ({ row, to }: { row: AdminApplicationRow; to: AtsStageId }) =>
      updateApplicationStage({ applicationId: row.id, from: row.status, to, actorId: user?.id }),
    onSuccess: () => {
      toast.success("Application moved.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not move application"),
  });

  const bulkMove = useMutation({
    mutationFn: async (to: AtsStageId) => bulkUpdateStage(table.selectedIds, to, user?.id),
    onSuccess: () => {
      toast.success("Applications updated.");
      table.setSelectedIds([]);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update applications"),
  });

  const bulkAssign = useMutation({
    mutationFn: async (recruiterId: string | null) => bulkAssignRecruiter(table.selectedIds, recruiterId),
    onSuccess: () => {
      toast.success("Recruiter assigned.");
      table.setSelectedIds([]);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign recruiter"),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async () => bulkReject(table.selectedIds, user?.id),
    onSuccess: () => {
      toast.success("Applications rejected.");
      table.setSelectedIds([]);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not reject applications"),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: async (archived: boolean) => bulkArchive(table.selectedIds, archived),
    onSuccess: (_, archived) => {
      toast.success(archived ? "Applications archived." : "Applications restored.");
      table.setSelectedIds([]);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update applications"),
  });

  const metrics = useMemo(() => {
    const active = rows.filter((r) => !r.archived && !["rejected", "hired"].includes(atsStage(r.status)));
    const inInterview = rows.filter((r) =>
      ["interview_scheduled", "interview_completed"].includes(atsStage(r.status)),
    );
    const offersOut = rows.filter((r) => atsStage(r.status) === "offer_sent");
    const now = new Date();
    const hiredThisMonth = rows.filter((r) => {
      if (atsStage(r.status) !== "hired") return false;
      const d = new Date(r.updated_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const rejected = rows.filter((r) => atsStage(r.status) === "rejected");
    return {
      active: active.length,
      inInterview: inInterview.length,
      offersOut: offersOut.length,
      hiredThisMonth: hiredThisMonth.length,
      rejected: rejected.length,
    };
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
      cell: (r) => <StatusBadge label={atsStageLabel(r.status)} tone={atsStageTone(r.status)} />,
      sortValue: (r) => atsStageLabel(r.status),
    },
    {
      id: "recruiter",
      header: "Recruiter",
      cell: (r) => <RecruiterLabel id={r.assigned_recruiter} />,
      sortValue: (r) => r.assigned_recruiter ?? "",
    },
    {
      id: "salary",
      header: "Expected salary",
      cell: (r) => formatMoney(r.expected_salary),
      sortValue: (r) => r.expected_salary ?? 0,
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

  const openApplication = (id: string) =>
    navigate({ to: "/admin/applications/$applicationId", params: { applicationId: id } });

  const bulkActions = (
    <>
      <Select onValueChange={(v) => bulkMove.mutate(v as AtsStageId)}>
        <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Move to stage…" /></SelectTrigger>
        <SelectContent>
          {ATS_STAGES.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <RecruiterSelect value={null} onChange={(v) => bulkAssign.mutate(v)} placeholder="Assign recruiter…" className="h-8 w-48" />
      <Button size="sm" variant="outline" onClick={() => bulkRejectMutation.mutate()}>
        <XCircle className="mr-2 h-4 w-4" /> Reject
      </Button>
      <Button size="sm" variant="outline" onClick={() => bulkArchiveMutation.mutate(!showArchived)}>
        {showArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
        {showArchived ? "Restore" : "Archive"}
      </Button>
      <Button size="sm" variant="outline" onClick={exportCsv}>
        <Download className="mr-2 h-4 w-4" /> Export CSV
      </Button>
    </>
  );

  const filterControls = (
    <>
      <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search candidate, job, school…" />
      <Select value={table.filters.stage} onValueChange={(v) => table.setFilter("stage", v)}>
        <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All stages</SelectItem>
          {ATS_STAGES.map((s) => (
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
      <Select value={table.filters.recruiter} onValueChange={(v) => table.setFilter("recruiter", v)}>
        <SelectTrigger><SelectValue placeholder="Recruiter" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All recruiters</SelectItem>
          <SelectItem value="__unassigned">Unassigned</SelectItem>
          {allRecruiters.map((r) => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
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
    </>
  );

  return (
    <div>
      <PageHeader title="Applications" description="Track every candidate application across schools and vacancies." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total active" value={metrics.active} icon={Send} />
        <MetricCard label="In interview" value={metrics.inInterview} tone="gold" />
        <MetricCard label="Offers out" value={metrics.offersOut} icon={UserCheck} />
        <MetricCard label="Hired this month" value={metrics.hiredThisMonth} />
        <MetricCard label="Rejected" value={metrics.rejected} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SavedViewsBar
          module="applications"
          config={table.filters}
          onApply={(config) => {
            for (const [k, v] of Object.entries(config)) {
              if (typeof v === "string") table.setFilter(k as keyof Filters, v);
            }
          }}
        />
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={(v) => table.setFilter("archived", v ? "true" : "false")}
          />
          <Label htmlFor="show-archived" className="text-sm text-muted-foreground">Archived</Label>
        </div>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="split">Split</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-5">
          <FilterToolbar onReset={table.reset}>{filterControls}</FilterToolbar>
          <BulkActionsToolbar count={table.selectedIds.length} onClear={() => table.setSelectedIds([])}>
            {bulkActions}
          </BulkActionsToolbar>
          {isLoading ? (
            <LoadingSkeleton variant="cards" rows={8} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No applications yet" description="Applications will appear here once candidates apply." />
          ) : (
            <ApplicationsKanban
              rows={filtered}
              recruiters={allRecruiters}
              onMove={(row, to) => move.mutate({ row, to })}
              onOpen={openApplication}
              selectedIds={table.selectedIds}
              onSelectionChange={table.setSelectedIds}
            />
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-5">
          <FilterToolbar onReset={table.reset} right={
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          }>
            {filterControls}
          </FilterToolbar>

          <BulkActionsToolbar count={table.selectedIds.length} onClear={() => table.setSelectedIds([])}>
            {bulkActions}
          </BulkActionsToolbar>

          <DataTable
            rows={pageRows}
            columns={columns}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            onRowClick={(r) => openApplication(r.id)}
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

        <TabsContent value="split" className="mt-5">
          <FilterToolbar onReset={table.reset}>{filterControls}</FilterToolbar>
          <BulkActionsToolbar count={table.selectedIds.length} onClear={() => table.setSelectedIds([])}>
            {bulkActions}
          </BulkActionsToolbar>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {isLoading ? (
              <LoadingSkeleton variant="cards" rows={8} />
            ) : filtered.length === 0 ? (
              <EmptyState title="No applications yet" description="Applications will appear here once candidates apply." />
            ) : (
              <ApplicationsKanban
                rows={filtered}
                recruiters={allRecruiters}
                onMove={(row, to) => move.mutate({ row, to })}
                onOpen={openApplication}
                selectedIds={table.selectedIds}
                onSelectionChange={table.setSelectedIds}
              />
            )}
            <DataTable
              rows={pageRows}
              columns={columns}
              getRowId={(r) => r.id}
              isLoading={isLoading}
              onRowClick={(r) => openApplication(r.id)}
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
