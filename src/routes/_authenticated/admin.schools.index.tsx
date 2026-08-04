import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { BulkActionsToolbar } from "@/components/crm/CrmPrimitives";
import { RecruiterLabel, RecruiterSelect } from "@/components/crm/RecruiterSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { assignRecruiter } from "@/lib/recruiters";
import {
  fetchAdminSchools,
  formatDate,
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  type SchoolListRow,
} from "@/lib/admin-schools";

export const Route = createFileRoute("/_authenticated/admin/schools/")({
  component: AdminSchools,
});

const PAGE_SIZE = 10;
const ANY_RECRUITER = "__any_recruiter__";
type SortKey = "recent" | "name" | "jobs" | "applications";

function AdminSchools() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [board, setBoard] = useState("all");
  const [city, setCity] = useState("all");
  const [status, setStatus] = useState("all");
  const [recruiter, setRecruiter] = useState(ANY_RECRUITER);
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: fetchAdminSchools,
  });

  const bulkAssign = useMutation({
    mutationFn: (recruiterId: string | null) => assignRecruiter("schools", selectedIds, recruiterId),
    onSuccess: () => {
      toast.success("Recruiter assigned.");
      setSelectedIds([]);
      void qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign recruiter"),
  });

  const schools = data ?? [];
  const boards = useMemo(
    () => Array.from(new Set(schools.map((s) => s.board).filter(Boolean) as string[])).sort(),
    [schools],
  );
  const cities = useMemo(
    () => Array.from(new Set(schools.map((s) => s.city).filter(Boolean) as string[])).sort(),
    [schools],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = schools.filter((s) => {
      if (board !== "all" && s.board !== board) return false;
      if (city !== "all" && s.city !== city) return false;
      if (status !== "all" && s.subscription_status !== status) return false;
      if (recruiter !== ANY_RECRUITER && (s.assigned_recruiter ?? "") !== recruiter) return false;
      if (!term) return true;
      return [s.name, s.city, s.board, s.principal_name, s.hr_name, s.contact_email, s.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "jobs") return b.activeJobs - a.activeJobs;
      if (sort === "applications") return b.applications - a.applications;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [schools, q, board, city, status, recruiter, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const pageIds = pageRows.map((s) => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const openSchool = (s: SchoolListRow) =>
    void navigate({ to: "/admin/schools/$schoolId", params: { schoolId: s.id } });

  return (
    <div>
      <PageHeader title="Schools" description="Every school account on Jivorna, with live hiring activity." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search school, contact, city…"
            className="pl-9"
          />
        </div>
        <Filter value={board} onChange={setBoard} placeholder="All boards" options={boards} allLabel="All boards" />
        <Filter value={city} onChange={setCity} placeholder="All cities" options={cities} allLabel="All cities" />
        <RecruiterSelect
          value={recruiter === ANY_RECRUITER ? null : recruiter}
          onChange={(v) => setRecruiter(v ?? ANY_RECRUITER)}
          placeholder="Any recruiter"
          includeUnassigned
        />
        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v as SortKey);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Newest first</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="jobs">Most active jobs</SelectItem>
            <SelectItem value="applications">Most applications</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "active", "trial", "past_due", "cancelled"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "gold" : "outline"}
            onClick={() => {
              setStatus(s);
              setPage(0);
            }}
          >
            {s === "all" ? "All" : VERIFICATION_LABELS[s]}
          </Button>
        ))}
      </div>

      <BulkActionsToolbar count={selectedIds.length} onClear={() => setSelectedIds([])}>
        <RecruiterSelect
          value={null}
          onChange={(v) => bulkAssign.mutate(v)}
          placeholder="Assign recruiter"
          className="h-9 w-52"
        />
      </BulkActionsToolbar>

      {isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState title="No schools match" description="Try a different search or filter." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected}
                      aria-label="Select all rows"
                      onCheckedChange={(v) =>
                        setSelectedIds((prev) =>
                          v
                            ? Array.from(new Set([...prev, ...pageIds]))
                            : prev.filter((id) => !pageIds.includes(id)),
                        )
                      }
                    />
                  </TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Contact person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Assigned recruiter</TableHead>
                  <TableHead className="text-right">Active jobs</TableHead>
                  <TableHead className="text-right">Applications</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => openSchool(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openSchool(s);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(s.id)}
                        aria-label="Select row"
                        onCheckedChange={(v) =>
                          setSelectedIds((prev) => (v ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.board ?? "—"}</TableCell>
                    <TableCell>{s.city ?? "—"}</TableCell>
                    <TableCell>{s.principal_name || s.hr_name || "—"}</TableCell>
                    <TableCell>{s.phone ?? "—"}</TableCell>
                    <TableCell>{s.contact_email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={VERIFICATION_TONES[s.subscription_status]}>
                        {VERIFICATION_LABELS[s.subscription_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <RecruiterLabel id={s.assigned_recruiter} />
                    </TableCell>
                    <TableCell className="text-right">{s.activeJobs}</TableCell>
                    <TableCell className="text-right">{s.applications}</TableCell>
                    <TableCell>{formatDate(s.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {current * PAGE_SIZE + 1}–{Math.min(rows.length, (current + 1) * PAGE_SIZE)} of {rows.length}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Filter({
  value,
  onChange,
  placeholder,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
