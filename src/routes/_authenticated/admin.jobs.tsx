import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  Check,
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/Primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { jobStatusLabel, jobStatusTone, type JobStatus } from "@/lib/jobStatus";
import {
  downloadCsv,
  fetchAdminJobs,
  fetchSchoolOptions,
  jobsToCsv,
  salaryRangeLabel,
  type AdminJobRow,
} from "@/lib/admin-jobs";
import {
  AdminJobEditorDialog,
  AdminJobViewDialog,
  editorFromJob,
  newEditorState,
  type JobEditorState,
} from "@/components/admin/JobDialogs";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  component: AdminJobs,
});

const ANY = "__any";
const PAGE_SIZE = 10;

type SortKey =
  | "title"
  | "schoolName"
  | "board"
  | "subject"
  | "grade"
  | "location"
  | "employment_type"
  | "applications"
  | "status"
  | "createdBy"
  | "created_at"
  | "updated_at";

type Column = { key: SortKey | "actions"; label: string; width: number; sortable: boolean; numeric?: boolean };

const COLUMNS: Column[] = [
  { key: "title", label: "Job title", width: 220, sortable: true },
  { key: "schoolName", label: "School", width: 180, sortable: true },
  { key: "board", label: "Board", width: 110, sortable: true },
  { key: "subject", label: "Subject", width: 130, sortable: true },
  { key: "grade", label: "Grade", width: 140, sortable: true },
  { key: "location", label: "City", width: 140, sortable: true },
  { key: "employment_type", label: "Employment type", width: 150, sortable: true },
  { key: "salary_range" as SortKey, label: "Salary range", width: 170, sortable: false },
  { key: "applications", label: "Applications", width: 120, sortable: true, numeric: true },
  { key: "status", label: "Status", width: 130, sortable: true },
  { key: "createdBy", label: "Created by", width: 160, sortable: true },
  { key: "created_at", label: "Created", width: 120, sortable: true },
  { key: "updated_at", label: "Last updated", width: 130, sortable: true },
  { key: "actions", label: "Actions", width: 100, sortable: false },
];

const STATUS_OPTIONS: { value: JobStatus | "archived"; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending review" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed / archived" },
];

const dateOnly = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function AdminJobs() {
  const qc = useQueryClient();

  const jobsQuery = useQuery({ queryKey: ["admin-jobs"], queryFn: fetchAdminJobs });
  const schoolsQuery = useQuery({ queryKey: ["admin-school-options"], queryFn: fetchSchoolOptions });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(ANY);
  const [board, setBoard] = useState<string>(ANY);
  const [city, setCity] = useState<string>(ANY);
  const [type, setType] = useState<string>(ANY);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);

  const [widths, setWidths] = useState<Record<string, number>>(
    () => Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])),
  );
  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const [editor, setEditor] = useState<JobEditorState>(null);
  const [viewing, setViewing] = useState<AdminJobRow | null>(null);
  const [deleting, setDeleting] = useState<AdminJobRow | null>(null);

  const rows = jobsQuery.data ?? [];

  const facets = useMemo(() => {
    const uniq = (vals: (string | null)[]) =>
      Array.from(new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))).sort();
    return {
      boards: uniq(rows.map((r) => r.board)),
      cities: uniq(rows.map((r) => r.location)),
      types: uniq(rows.map((r) => r.employment_type)),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 86_400_000 : null;
    return rows.filter((r) => {
      if (status !== ANY && r.status !== status) return false;
      if (board !== ANY && r.board !== board) return false;
      if (city !== ANY && r.location !== city) return false;
      if (type !== ANY && r.employment_type !== type) return false;
      const created = new Date(r.created_at).getTime();
      if (fromTs !== null && created < fromTs) return false;
      if (toTs !== null && created >= toTs) return false;
      if (!needle) return true;
      return [r.title, r.schoolName, r.subject, r.grade, r.board, r.location, r.employment_type, r.createdBy]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, status, board, city, type, from, to]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      let cmp: number;
      if (typeof av === "number" || typeof bv === "number") cmp = Number(av ?? 0) - Number(bv ?? 0);
      else if (sort.key === "created_at" || sort.key === "updated_at")
        cmp = new Date(String(av)).getTime() - new Date(String(bv)).getTime();
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length, published: 0, pending_review: 0, draft: 0, closed: 0 };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtersActive =
    q !== "" || status !== ANY || board !== ANY || city !== ANY || type !== ANY || from !== "" || to !== "";

  const resetFilters = () => {
    setQ("");
    setStatus(ANY);
    setBoard(ANY);
    setCity(ANY);
    setType(ANY);
    setFrom("");
    setTo("");
    setPage(1);
  };

  const setStatusMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: JobStatus }) => {
      const { error } = await supabase.from("jobs").update({ status: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(
        next === "published"
          ? "Vacancy approved and published."
          : next === "closed"
            ? "Vacancy archived."
            : "Vacancy sent back to draft.",
      );
      void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update vacancy"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vacancy deleted.");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete vacancy"),
  });

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { key, startX: e.clientX, startW: widths[key] ?? 140 };
    const move = (ev: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      setWidths((w) => ({ ...w, [d.key]: Math.max(80, d.startW + (ev.clientX - d.startX)) }));
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  return (
    <div>
      <PageHeader
        title="Job management"
        description="Every vacancy on Jivorna — review, publish, edit and archive from one place."
        action={
          <Button variant="gold" onClick={() => setEditor(newEditorState(schoolsQuery.data ?? []))}>
            <Plus /> New job
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total jobs" value={jobsQuery.isLoading ? "—" : counts['total']} />
        <StatCard label="Published" value={jobsQuery.isLoading ? "—" : (counts['published'] ?? 0)} />
        <StatCard label="Pending review" value={jobsQuery.isLoading ? "—" : (counts['pending_review'] ?? 0)} />
        <StatCard label="Drafts" value={jobsQuery.isLoading ? "—" : (counts['draft'] ?? 0)} />
        <StatCard label="Closed / archived" value={jobsQuery.isLoading ? "—" : (counts['closed'] ?? 0)} />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, school, subject, city or creator"
              className="h-11 bg-card pl-9"
              aria-label="Search vacancies"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetFilters} disabled={!filtersActive}>
              <RotateCcw /> Reset filters
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCsv("jivorna-jobs.csv", jobsToCsv(sorted, jobStatusLabel))}
              disabled={sorted.length === 0}
            >
              <Download /> Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FilterSelect
            id="f-status"
            label="Status"
            anyLabel="All statuses"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          />
          <FilterSelect
            id="f-board"
            label="Board"
            anyLabel="All boards"
            value={board}
            onChange={(v) => {
              setBoard(v);
              setPage(1);
            }}
            options={facets.boards.map((b) => ({ value: b, label: b }))}
          />
          <FilterSelect
            id="f-city"
            label="City"
            anyLabel="All cities"
            value={city}
            onChange={(v) => {
              setCity(v);
              setPage(1);
            }}
            options={facets.cities.map((c) => ({ value: c, label: c }))}
          />
          <FilterSelect
            id="f-type"
            label="Employment type"
            anyLabel="All types"
            value={type}
            onChange={(v) => {
              setType(v);
              setPage(1);
            }}
            options={facets.types.map((t) => ({ value: t, label: t }))}
          />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Created between</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="h-10 bg-card"
                aria-label="Created from"
              />
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="h-10 bg-card"
                aria-label="Created to"
              />
            </div>
          </div>
        </div>
      </div>

      {jobsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-xl" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : jobsQuery.isError ? (
        <EmptyState
          title="We couldn't load vacancies"
          description={jobsQuery.error instanceof Error ? jobsQuery.error.message : "Something went wrong."}
          action={<Button onClick={() => void jobsQuery.refetch()}>Try again</Button>}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No vacancies yet" : "No vacancies match these filters"}
          description={
            rows.length === 0
              ? "Roles created by schools — or by you — will appear here."
              : "Try widening your search or resetting the filters."
          }
          action={
            rows.length === 0 ? (
              <Button variant="gold" onClick={() => setEditor(newEditorState(schoolsQuery.data ?? []))}>
                <Plus /> New job
              </Button>
            ) : (
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw /> Reset filters
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      style={{ width: widths[c.key] }}
                      className="relative border-b border-border px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => toggleSort(c.key as SortKey)}
                        >
                          {c.label}
                          {sort.key === c.key ? <span aria-hidden>{sort.dir === "asc" ? "▲" : "▼"}</span> : null}
                        </button>
                      ) : (
                        c.label
                      )}
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${c.label} column`}
                        onMouseDown={(e) => startResize(c.key, e)}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-border"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((j) => (
                  <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="truncate px-4 py-3 font-medium">{j.title}</td>
                    <td className="truncate px-4 py-3">{j.schoolName}</td>
                    <td className="truncate px-4 py-3">{j.board ?? "—"}</td>
                    <td className="truncate px-4 py-3">{j.subject ?? "—"}</td>
                    <td className="truncate px-4 py-3">{j.grade ?? "—"}</td>
                    <td className="truncate px-4 py-3">{j.location ?? "—"}</td>
                    <td className="truncate px-4 py-3">{j.employment_type}</td>
                    <td className="truncate px-4 py-3">{salaryRangeLabel(j)}</td>
                    <td className="px-4 py-3">{j.applications}</td>
                    <td className="px-4 py-3">
                      <Badge variant={jobStatusTone(j.status)}>{jobStatusLabel(j.status)}</Badge>
                    </td>
                    <td className="truncate px-4 py-3">{j.createdBy}</td>
                    <td className="truncate px-4 py-3 text-muted-foreground">{dateOnly(j.created_at)}</td>
                    <td className="truncate px-4 py-3 text-muted-foreground">{dateOnly(j.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${j.title}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setViewing(j)}>
                            <Eye /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEditor(editorFromJob(j, "edit"))}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEditor(editorFromJob(j, "duplicate"))}>
                            <Copy /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {j.status === "pending_review" && (
                            <DropdownMenuItem
                              onSelect={() => setStatusMutation.mutate({ id: j.id, next: "published" })}
                            >
                              <Check /> Approve &amp; publish
                            </DropdownMenuItem>
                          )}
                          {j.status !== "draft" && (
                            <DropdownMenuItem onSelect={() => setStatusMutation.mutate({ id: j.id, next: "draft" })}>
                              <Undo2 /> Send back to draft
                            </DropdownMenuItem>
                          )}
                          {j.status !== "closed" && (
                            <DropdownMenuItem onSelect={() => setStatusMutation.mutate({ id: j.id, next: "closed" })}>
                              <Archive /> Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(j)}>
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of{" "}
              {sorted.length} vacancies
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <AdminJobEditorDialog state={editor} schools={schoolsQuery.data ?? []} onClose={() => setEditor(null)} />
      <AdminJobViewDialog job={viewing} onClose={() => setViewing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this vacancy?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” at {deleting?.schoolName} will be removed permanently. Applications linked to it are
              deleted too. Archive instead if you only want it off the board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete vacancy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  anyLabel,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 bg-card">
          <SelectValue placeholder={anyLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
