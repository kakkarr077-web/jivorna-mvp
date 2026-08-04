import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/crm/CrmPrimitives";
import { DataTable, type DataTableColumn } from "@/components/crm/DataTable";
import { RecruiterLabel, RecruiterSelect } from "@/components/crm/RecruiterSelect";
import { assignRecruiter } from "@/lib/recruiters";
import { useCrmTable, useFacet, paginate } from "@/hooks/useCrmTable";
import { toCsv, downloadCsvFile, formatDate, formatMoney, matchesTerm, initialsOf, dash } from "@/lib/crm";
import {
  fetchAdminTeachers,
  TEACHER_CSV_COLUMNS,
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  type TeacherListRow,
  type TeacherStatus,
} from "@/lib/admin-teachers";

export const Route = createFileRoute("/_authenticated/admin/teachers/")({
  component: AdminTeachers,
});

type Filters = {
  subject: string;
  experience: string;
  city: string;
  board: string;
  availability: string;
  recruiter: string;
};

const INITIAL_FILTERS: Filters = { subject: "all", experience: "all", city: "all", board: "all", availability: "all", recruiter: "all" };

const EXPERIENCE_BANDS: { id: string; label: string; test: (v: number) => boolean }[] = [
  { id: "0-2", label: "0–2 yrs", test: (v) => v <= 2 },
  { id: "3-5", label: "3–5 yrs", test: (v) => v >= 3 && v <= 5 },
  { id: "6-10", label: "6–10 yrs", test: (v) => v >= 6 && v <= 10 },
  { id: "10+", label: "10+ yrs", test: (v) => v > 10 },
];

function AdminTeachers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const table = useCrmTable<Filters>(INITIAL_FILTERS);

  const { data, isLoading } = useQuery({ queryKey: ["admin-teachers"], queryFn: fetchAdminTeachers });
  const teachers = data ?? [];

  const subjects = useFacet(teachers, (t) => t.subjects[0] ?? null);
  const allSubjects = useMemo(
    () => Array.from(new Set(teachers.flatMap((t) => t.subjects))).sort(),
    [teachers],
  );
  const cities = useFacet(teachers, (t) => t.city);
  const boards = useMemo(
    () => Array.from(new Set(teachers.flatMap((t) => t.boards))).sort(),
    [teachers],
  );

  const bulkAssign = useMutation({
    mutationFn: ({ ids, recruiterId }: { ids: string[]; recruiterId: string | null }) =>
      assignRecruiter("teacher_profiles", ids, recruiterId),
    onSuccess: () => {
      toast.success("Recruiter assigned.");
      table.setSelectedIds([]);
      void qc.invalidateQueries({ queryKey: ["admin-teachers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign recruiter"),
  });

  const bulkStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: TeacherStatus }) => {
      const { error } = await supabase.from("teacher_profiles").update({ status }).in("user_id", ids);
      if (error) throw error;
      return status;
    },
    onMutate: async ({ ids, status }) => {
      await qc.cancelQueries({ queryKey: ["admin-teachers"] });
      const prev = qc.getQueryData<TeacherListRow[]>(["admin-teachers"]);
      qc.setQueryData<TeacherListRow[]>(["admin-teachers"], (old) =>
        (old ?? []).map((t) => (ids.includes(t.user_id) ? { ...t, status } : t)),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-teachers"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Could not update teachers");
    },
    onSuccess: (status) => {
      toast.success(`Updated verification to ${VERIFICATION_LABELS[status]}.`);
      table.setSelectedIds([]);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["admin-teachers"] }),
  });

  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      if (table.filters.subject !== "all" && !t.subjects.includes(table.filters.subject)) return false;
      if (table.filters.city !== "all" && t.city !== table.filters.city) return false;
      if (table.filters.board !== "all" && !t.boards.includes(table.filters.board)) return false;
      if (table.filters.availability === "available" && !t.available) return false;
      if (table.filters.availability === "unavailable" && t.available) return false;
      if (table.filters.recruiter !== "all" && (t.assigned_recruiter ?? "") !== table.filters.recruiter) return false;
      if (table.filters.experience !== "all") {
        const band = EXPERIENCE_BANDS.find((b) => b.id === table.filters.experience);
        if (band && !band.test(t.experience_years)) return false;
      }
      return matchesTerm(table.debouncedSearch, [
        t.full_name,
        t.email,
        t.city,
        t.qualification,
        ...t.subjects,
      ]);
    });
  }, [teachers, table.filters, table.debouncedSearch]);

  const columns: DataTableColumn<TeacherListRow>[] = [
    {
      id: "photo",
      header: "",
      cell: (t) => (
        <Avatar className="h-9 w-9">
          <AvatarImage src={t.profile_photo_url ?? t.avatar_url ?? undefined} alt={t.full_name ?? "Teacher"} />
          <AvatarFallback>{initialsOf(t.full_name, "T")}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      id: "name",
      header: "Name",
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{t.full_name ?? "Unnamed teacher"}</p>
          <p className="truncate text-xs text-muted-foreground">{t.email ?? "—"}</p>
        </div>
      ),
      sortValue: (t) => t.full_name ?? "",
    },
    {
      id: "subjects",
      header: "Subjects",
      cell: (t) => <span className="text-sm">{t.subjects.length ? t.subjects.join(", ") : dash(null)}</span>,
    },
    {
      id: "experience",
      header: "Experience",
      cell: (t) => `${t.experience_years} yrs`,
      sortValue: (t) => t.experience_years,
      align: "right",
    },
    {
      id: "qualification",
      header: "Qualification",
      cell: (t) => dash(t.qualification),
    },
    {
      id: "boards",
      header: "Preferred boards",
      cell: (t) => (t.boards.length ? t.boards.join(", ") : dash(null)),
    },
    {
      id: "city",
      header: "Preferred city",
      cell: (t) => dash(t.city),
      sortValue: (t) => t.city ?? "",
    },
    {
      id: "salary",
      header: "Expected salary",
      cell: (t) => formatMoney(t.expected_salary),
      sortValue: (t) => t.expected_salary ?? 0,
      align: "right",
    },
    {
      id: "availability",
      header: "Availability",
      cell: (t) =>
        t.available ? (
          <StatusBadge label="Available now" tone="default" />
        ) : (
          <StatusBadge label={t.available_from ? `From ${formatDate(t.available_from)}` : "Not available"} tone="outline" />
        ),
    },
    {
      id: "applications",
      header: "Applications",
      cell: (t) => t.applications,
      sortValue: (t) => t.applications,
      align: "right",
    },
    {
      id: "status",
      header: "Verification",
      cell: (t) => <StatusBadge label={VERIFICATION_LABELS[t.status]} tone={VERIFICATION_TONES[t.status]} />,
    },
    {
      id: "completion",
      header: "Profile completion",
      cell: (t) => (
        <div className="flex items-center gap-2">
          <Progress value={t.profileCompletion} className="h-2 w-20" />
          <span className="text-xs text-muted-foreground">{t.profileCompletion}%</span>
        </div>
      ),
      sortValue: (t) => t.profileCompletion,
    },
    {
      id: "joined",
      header: "Date joined",
      cell: (t) => formatDate(t.created_at),
      sortValue: (t) => new Date(t.created_at).getTime(),
    },
    {
      id: "recruiter",
      header: "Assigned recruiter",
      cell: (t) => <RecruiterLabel id={t.assigned_recruiter} />,
    },
  ];

  const sorted = useMemo(() => {
    if (!table.sort) return filtered;
    const col = columns.find((c) => c.id === table.sort!.id);
    if (!col?.sortValue) return filtered;
    const factor = table.sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, table.sort]);

  const { pageRows, current } = paginate(sorted, table.page, table.pageSize);

  const metrics = useMemo(() => {
    const total = teachers.length;
    const verified = teachers.filter((t) => t.status === "active" || t.status === "placed").length;
    const availableNow = teachers.filter((t) => t.available).length;
    const avgExperience = total
      ? Math.round((teachers.reduce((sum, t) => sum + t.experience_years, 0) / total) * 10) / 10
      : 0;
    return { total, verified, availableNow, avgExperience };
  }, [teachers]);

  const exportCsv = () => downloadCsvFile("teachers.csv", toCsv(TEACHER_CSV_COLUMNS, sorted));

  const setBulkStatus = (status: TeacherStatus) => {
    if (table.selectedIds.length === 0) return;
    bulkStatus.mutate({ ids: table.selectedIds, status });
  };

  return (
    <div>
      <PageHeader title="Teachers" description="Every teacher candidate on Jivorna, with live application activity." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total teachers" value={metrics.total} icon={GraduationCap} />
        <MetricCard label="Verified" value={metrics.verified} icon={ShieldCheck} tone="gold" />
        <MetricCard label="Available now" value={metrics.availableNow} icon={Sparkles} />
        <MetricCard label="Avg. experience" value={`${metrics.avgExperience} yrs`} icon={Timer} />
      </div>

      <FilterToolbar
        onReset={table.reset}
        right={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      >
        <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search name, email, city…" className="sm:col-span-2" />
        <Filter value={table.filters.subject} onChange={(v) => table.setFilter("subject", v)} placeholder="All subjects" options={allSubjects.length ? allSubjects : subjects} allLabel="All subjects" />
        <Filter
          value={table.filters.experience}
          onChange={(v) => table.setFilter("experience", v)}
          placeholder="All experience"
          options={EXPERIENCE_BANDS.map((b) => b.id)}
          labels={Object.fromEntries(EXPERIENCE_BANDS.map((b) => [b.id, b.label]))}
          allLabel="All experience"
        />
        <Filter value={table.filters.city} onChange={(v) => table.setFilter("city", v)} placeholder="All cities" options={cities} allLabel="All cities" />
        <Filter value={table.filters.board} onChange={(v) => table.setFilter("board", v)} placeholder="All boards" options={boards} allLabel="All boards" />
        <Filter
          value={table.filters.availability}
          onChange={(v) => table.setFilter("availability", v)}
          placeholder="Any availability"
          options={["available", "unavailable"]}
          labels={{ available: "Available now", unavailable: "Not available" }}
          allLabel="Any availability"
        />
        <RecruiterSelect
          value={table.filters.recruiter === "all" ? null : table.filters.recruiter}
          onChange={(v) => table.setFilter("recruiter", v ?? "all")}
          placeholder="Any recruiter"
          includeUnassigned
        />
      </FilterToolbar>

      <BulkActionsToolbar count={table.selectedIds.length} onClear={() => table.setSelectedIds([])}>
        {(Object.keys(VERIFICATION_LABELS) as TeacherStatus[]).map((s) => (
          <Button key={s} size="sm" variant="outline" disabled={bulkStatus.isPending} onClick={() => setBulkStatus(s)}>
            Mark {VERIFICATION_LABELS[s]}
          </Button>
        ))}
        <RecruiterSelect
          value={null}
          onChange={(v) => bulkAssign.mutate({ ids: table.selectedIds, recruiterId: v })}
          placeholder="Assign recruiter"
          className="h-9 w-52"
        />
      </BulkActionsToolbar>

      <DataTable
        rows={pageRows}
        columns={columns}
        getRowId={(t) => t.user_id}
        isLoading={isLoading}
        onRowClick={(t) => void navigate({ to: "/admin/teachers/$teacherId", params: { teacherId: t.user_id } })}
        sort={table.sort}
        onSortChange={table.setSort}
        selectedIds={table.selectedIds}
        onSelectionChange={table.setSelectedIds}
        emptyTitle="No teachers match"
        emptyDescription="Try a different search or filter."
        page={current}
        pageSize={table.pageSize}
        totalCount={sorted.length}
        onPageChange={table.setPage}
      />
    </div>
  );
}

function Filter({
  value,
  onChange,
  placeholder,
  options,
  allLabel,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  allLabel: string;
  labels?: Record<string, string>;
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
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
