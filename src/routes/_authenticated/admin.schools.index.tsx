import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  fetchAdminSchools,
  VERIFICATION_LABEL,
  verificationVariant,
  type AdminSchoolRow,
} from "@/lib/admin-schools";

export const Route = createFileRoute("/_authenticated/admin/schools/")({
  component: AdminSchools,
});

const ANY = "__any__";
const PAGE_SIZE = 10;

type SortKey = "name" | "created_at" | "active_jobs" | "applications";

function AdminSchools() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-schools"], queryFn: fetchAdminSchools });

  const [q, setQ] = useState("");
  const [board, setBoard] = useState(ANY);
  const [city, setCity] = useState(ANY);
  const [status, setStatus] = useState(ANY);
  const [sort, setSort] = useState<SortKey>("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const rows = data ?? [];
  const boards = useMemo(
    () => [...new Set(rows.map((r) => r.board).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const cities = useMemo(
    () => [...new Set(rows.map((r) => r.city).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (board !== ANY && r.board !== board) return false;
      if (city !== ANY && r.city !== city) return false;
      if (status !== ANY && r.subscription_status !== status) return false;
      if (!needle) return true;
      return [r.name, r.board, r.city, r.contact_person, r.phone, r.contact_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
    const mult = dir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name) * mult;
      if (sort === "created_at") return (a.created_at < b.created_at ? -1 : 1) * mult;
      return ((a[sort] as number) - (b[sort] as number)) * mult;
    });
  }, [rows, q, board, city, status, sort, dir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    setPage(0);
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "name" ? "asc" : "desc");
    }
  };

  const SortHead = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sort === k &&
          (dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
      </button>
    </TableHead>
  );

  return (
    <div>
      <PageHeader
        title="Schools"
        description="Every registered institution, its account owner and hiring activity."
      />

      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search by school, city, contact person, phone or email"
            className="h-11 bg-card pl-9"
            aria-label="Search schools"
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { id: "f-board", label: "Board", any: "All boards", value: board, set: setBoard, options: boards },
            { id: "f-city", label: "City", any: "All cities", value: city, set: setCity, options: cities },
          ].map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={f.id} className="text-xs font-medium text-muted-foreground">
                {f.label}
              </Label>
              <Select
                value={f.value}
                onValueChange={(v) => {
                  f.set(v);
                  setPage(0);
                }}
              >
                <SelectTrigger id={f.id} className="h-10 bg-card">
                  <SelectValue placeholder={f.any} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>{f.any}</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="f-status" className="text-xs font-medium text-muted-foreground">
              Verification
            </Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger id="f-status" className="h-10 bg-card">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All statuses</SelectItem>
                {(Object.keys(VERIFICATION_LABEL) as (keyof typeof VERIFICATION_LABEL)[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {VERIFICATION_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No schools match these filters"
            description="Try clearing the search or choosing a different board or city."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead label="School" k="name" />
                    <TableHead>Board</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Contact person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Verification</TableHead>
                    <SortHead label="Active jobs" k="active_jobs" className="text-right" />
                    <SortHead label="Applications" k="applications" className="text-right" />
                    <SortHead label="Joined" k="created_at" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((s: AdminSchoolRow) => (
                    <TableRow
                      key={s.id}
                      tabIndex={0}
                      role="link"
                      onClick={() =>
                        navigate({ to: "/admin/schools/$schoolId", params: { schoolId: s.id } })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          void navigate({ to: "/admin/schools/$schoolId", params: { schoolId: s.id } });
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.board || "—"}</TableCell>
                      <TableCell>{s.city || "—"}</TableCell>
                      <TableCell>{s.contact_person || "—"}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{s.contact_email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={verificationVariant(s.subscription_status)}>
                          {VERIFICATION_LABEL[s.subscription_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.active_jobs}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.applications}</TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Showing {current * PAGE_SIZE + 1}–{Math.min(filtered.length, (current + 1) * PAGE_SIZE)} of{" "}
                {filtered.length} schools
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className={cn("text-sm text-muted-foreground")}>
                  Page {current + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
