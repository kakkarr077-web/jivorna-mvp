import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, ClipboardList, Download, Plus, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  BulkActionsToolbar,
  LoadingSkeleton,
  EmptyState,
} from "@/components/crm/CrmPrimitives";
import { DataTable, type DataTableColumn, type SortState, sortRows } from "@/components/crm/DataTable";
import { useCrmTable, useFacet, paginate } from "@/hooks/useCrmTable";
import { downloadCsvFile, toCsv, formatDate, dash } from "@/lib/crm";
import { NewLeadDialog } from "@/components/admin/LeadDialogs";
import {
  fetchLeads,
  bulkUpdateLeads,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_PRIORITY_TONES,
  LEAD_CSV_COLUMNS,
  isFollowUpDueThisWeek,
  type LeadListRow,
  type LeadStatus,
  type LeadPriority,
} from "@/lib/admin-leads";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/leads/")({
  component: AdminLeads,
});

type Filters = { status: string; priority: string; city: string; board: string; assigned: string };

function AdminLeads() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const table = useCrmTable<Filters>({ status: "all", priority: "all", city: "all", board: "all", assigned: "all" });

  const { data, isLoading } = useQuery({ queryKey: ["admin-leads"], queryFn: fetchLeads });
  const leads = data ?? [];

  const cities = useFacet(leads, (l) => l.city);
  const boards = useFacet(leads, (l) => l.board);
  const recruiters = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) if (l.assigned_to && l.assignedName) map.set(l.assigned_to, l.assignedName);
    return Array.from(map.entries());
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (table.filters.status !== "all" && l.status !== table.filters.status) return false;
      if (table.filters.priority !== "all" && l.priority !== table.filters.priority) return false;
      if (table.filters.city !== "all" && l.city !== table.filters.city) return false;
      if (table.filters.board !== "all" && l.board !== table.filters.board) return false;
      if (table.filters.assigned !== "all" && l.assigned_to !== table.filters.assigned) return false;
      const term = table.debouncedSearch.trim().toLowerCase();
      if (!term) return true;
      return [l.school_name, l.contact_person, l.phone, l.email, l.city, l.board, l.source, l.assignedName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [leads, table.filters, table.debouncedSearch]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const open = leads.filter((l) => l.status !== "won" && l.status !== "lost").length;
    const dueThisWeek = leads.filter((l) => isFollowUpDueThisWeek(l.next_follow_up)).length;
    const now = new Date();
    const wonThisMonth = leads.filter(
      (l) =>
        l.status === "won" &&
        new Date(l.updated_at).getMonth() === now.getMonth() &&
        new Date(l.updated_at).getFullYear() === now.getFullYear(),
    ).length;
    return { total, open, dueThisWeek, wonThisMonth };
  }, [leads]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["admin-leads"] });
      const prev = qc.getQueryData<LeadListRow[]>(["admin-leads"]);
      qc.setQueryData<LeadListRow[]>(["admin-leads"], (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, status } : l)),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-leads"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Could not update status");
    },
    onSuccess: () => toast.success("Lead status updated."),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["admin-leads"] }),
  });

  const bulkUpdate = useMutation({
    mutationFn: (input: { ids: string[]; patch: { status?: LeadStatus; priority?: LeadPriority } }) =>
      bulkUpdateLeads(input.ids, input.patch),
    onSuccess: () => {
      toast.success("Leads updated.");
      table.setSelectedIds([]);
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update leads"),
  });

  const openLead = (l: LeadListRow) => void navigate({ to: "/admin/leads/$leadId", params: { leadId: l.id } });

  const columns: DataTableColumn<LeadListRow>[] = [
    { id: "school_name", header: "School", cell: (r) => <span className="font-medium">{r.school_name}</span>, sortValue: (r) => r.school_name },
    { id: "contact_person", header: "Contact person", cell: (r) => dash(r.contact_person) },
    { id: "phone", header: "Phone", cell: (r) => dash(r.phone) },
    { id: "email", header: "Email", cell: (r) => dash(r.email) },
    { id: "city", header: "City", cell: (r) => dash(r.city), sortValue: (r) => r.city ?? "" },
    { id: "board", header: "Board", cell: (r) => dash(r.board) },
    { id: "source", header: "Source", cell: (r) => dash(r.source) },
    {
      id: "status",
      header: "Status",
      cell: (r) => <StatusBadge label={LEAD_STATUS_LABELS[r.status]} tone={LEAD_STATUS_TONES[r.status]} />,
      sortValue: (r) => r.status,
    },
    {
      id: "priority",
      header: "Priority",
      cell: (r) => <StatusBadge label={LEAD_PRIORITY_LABELS[r.priority]} tone={LEAD_PRIORITY_TONES[r.priority]} />,
      sortValue: (r) => r.priority,
    },
    {
      id: "next_follow_up",
      header: "Next follow-up",
      cell: (r) => formatDate(r.next_follow_up),
      sortValue: (r) => r.next_follow_up ?? "",
    },
    { id: "assigned", header: "Assigned recruiter", cell: (r) => dash(r.assignedName), sortValue: (r) => r.assignedName ?? "" },
  ];

  const sorted = sortRows(filtered, columns, table.sort);
  const { pageRows, current, pageCount } = paginate(sorted, table.page, table.pageSize);

  const exportCsv = () => downloadCsvFile(`leads-${Date.now()}.csv`, toCsv(LEAD_CSV_COLUMNS, sorted));

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Track prospective schools from first contact through conversion."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <NewLeadDialog
              trigger={
                <Button variant="gold">
                  <Plus className="mr-2 h-4 w-4" /> New lead
                </Button>
              }
            />
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total leads" value={metrics.total} icon={Target} />
        <MetricCard label="Open pipeline" value={metrics.open} icon={ClipboardList} />
        <MetricCard label="Follow-ups due this week" value={metrics.dueThisWeek} icon={TrendingUp} tone="gold" />
        <MetricCard label="Won this month" value={metrics.wonThisMonth} icon={CircleDollarSign} tone="gold" />
      </div>

      <Tabs defaultValue="kanban">
        <TabsList className="mb-6">
          <TabsTrigger value="kanban">Pipeline</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {isLoading ? (
            <LoadingSkeleton variant="cards" rows={7} />
          ) : (
            <KanbanBoard
              leads={filtered}
              onOpen={openLead}
              onDrop={(id, status) => updateStatus.mutate({ id, status })}
            />
          )}
        </TabsContent>

        <TabsContent value="table">
          <FilterToolbar
            onReset={table.reset}
            right={<SearchInput value={table.search} onChange={table.setSearch} placeholder="Search leads…" className="w-64" />}
          >
            <FacetSelect label="All statuses" value={table.filters.status} onChange={(v) => table.setFilter("status", v)} options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))} />
            <FacetSelect label="All priorities" value={table.filters.priority} onChange={(v) => table.setFilter("priority", v)} options={LEAD_PRIORITIES.map((p) => ({ value: p, label: LEAD_PRIORITY_LABELS[p] }))} />
            <FacetSelect label="All cities" value={table.filters.city} onChange={(v) => table.setFilter("city", v)} options={cities.map((c) => ({ value: c, label: c }))} />
            <FacetSelect label="All boards" value={table.filters.board} onChange={(v) => table.setFilter("board", v)} options={boards.map((b) => ({ value: b, label: b }))} />
            <FacetSelect label="All recruiters" value={table.filters.assigned} onChange={(v) => table.setFilter("assigned", v)} options={recruiters.map(([id, name]) => ({ value: id, label: name }))} />
          </FilterToolbar>

          <BulkActionsToolbar count={table.selectedIds.length} onClear={() => table.setSelectedIds([])}>
            <Select onValueChange={(v) => bulkUpdate.mutate({ ids: table.selectedIds, patch: { status: v as LeadStatus } })}>
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Set status" /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => bulkUpdate.mutate({ ids: table.selectedIds, patch: { priority: v as LeadPriority } })}>
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Set priority" /></SelectTrigger>
              <SelectContent>
                {LEAD_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{LEAD_PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BulkActionsToolbar>

          <DataTable
            rows={pageRows}
            columns={columns}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            onRowClick={openLead}
            sort={table.sort}
            onSortChange={(s: SortState) => table.setSort(s)}
            selectedIds={table.selectedIds}
            onSelectionChange={table.setSelectedIds}
            emptyTitle="No leads yet"
            emptyDescription="Create your first lead to start building the pipeline."
            page={current}
            pageSize={table.pageSize}
            totalCount={sorted.length}
            onPageChange={table.setPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FacetSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function KanbanBoard({ leads, onOpen, onDrop }: { leads: LeadListRow[]; onOpen: (l: LeadListRow) => void; onDrop: (id: string, status: LeadStatus) => void }) {
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  if (leads.length === 0) return <EmptyState title="No leads yet" description="Create a lead to see it here." />;

  return (
    <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-7">
      {LEAD_STATUSES.map((status) => {
        const items = leads.filter((l) => l.status === status);
        return (
          <div
            key={status}
            className={`min-w-[16rem] rounded-xl border border-border bg-surface p-3 transition-colors ${dragOverStatus === status ? "border-primary bg-primary-soft" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/lead-id");
              if (id) onDrop(id, status);
              setDragOverStatus(null);
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{LEAD_STATUS_LABELS[status]}</h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/lead-id", l.id)}
                  onClick={() => onOpen(l)}
                  className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-soft hover:border-primary/40"
                >
                  <p className="truncate text-sm font-medium">{l.school_name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{l.contact_person || l.city || "—"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge label={LEAD_PRIORITY_LABELS[l.priority]} tone={LEAD_PRIORITY_TONES[l.priority]} className="text-[10px]" />
                    {l.next_follow_up && <span className="text-[10px] text-muted-foreground">{formatDate(l.next_follow_up)}</span>}
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Drop leads here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
