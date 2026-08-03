import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANY,
  SORT_KEYS,
  SORT_LABELS,
  activeFilterCount,
  defaultJobSearch,
  jobFacets,
  type JobSearchState,
} from "@/lib/job-search";

const EXPERIENCE_OPTIONS = [
  { value: "0", label: "Any experience" },
  { value: "1", label: "Up to 1 year" },
  { value: "3", label: "Up to 3 years" },
  { value: "5", label: "Up to 5 years" },
  { value: "10", label: "Up to 10 years" },
];

const SALARY_OPTIONS = [
  { value: "0", label: "Any salary" },
  { value: "25000", label: "₹25,000+ / month" },
  { value: "40000", label: "₹40,000+ / month" },
  { value: "60000", label: "₹60,000+ / month" },
  { value: "90000", label: "₹90,000+ / month" },
];

type Facets = ReturnType<typeof jobFacets>;

function FacetSelect({
  id,
  label,
  value,
  options,
  anyLabel,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  anyLabel: string;
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
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function JobFilters({
  value,
  facets,
  resultCount,
  onChange,
  onReset,
}: {
  value: JobSearchState;
  facets: Facets;
  resultCount: number;
  onChange: (patch: Partial<JobSearchState>) => void;
  onReset: () => void;
}) {
  const active = activeFilterCount(value);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search roles, subjects, schools or cities"
            className="h-11 bg-card pl-9"
            aria-label="Search jobs"
          />
        </div>
        <div className="space-y-0 sm:w-56">
          <Select value={value.sort} onValueChange={(v) => onChange({ sort: v as JobSearchState["sort"] })}>
            <SelectTrigger className="h-11 bg-card" aria-label="Sort jobs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FacetSelect
          id="filter-subject"
          label="Subject"
          anyLabel="All subjects"
          value={value.subject}
          options={facets.subjects}
          onChange={(v) => onChange({ subject: v })}
        />
        <FacetSelect
          id="filter-board"
          label="Board"
          anyLabel="All boards"
          value={value.board}
          options={facets.boards}
          onChange={(v) => onChange({ board: v })}
        />
        <FacetSelect
          id="filter-location"
          label="Location"
          anyLabel="All locations"
          value={value.location}
          options={facets.locations}
          onChange={(v) => onChange({ location: v })}
        />
        <FacetSelect
          id="filter-type"
          label="Employment type"
          anyLabel="All types"
          value={value.type}
          options={facets.types}
          onChange={(v) => onChange({ type: v })}
        />
        <FacetSelect
          id="filter-school-type"
          label="School type"
          anyLabel="All school types"
          value={value.school}
          options={facets.schoolTypes}
          onChange={(v) => onChange({ school: v })}
        />

        <div className="space-y-1.5">
          <Label htmlFor="filter-exp" className="text-xs font-medium text-muted-foreground">
            Experience required
          </Label>
          <Select value={String(value.exp)} onValueChange={(v) => onChange({ exp: Number(v) })}>
            <SelectTrigger id="filter-exp" className="h-10 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-salary" className="text-xs font-medium text-muted-foreground">
            Minimum salary
          </Label>
          <Select value={String(value.salary)} onValueChange={(v) => onChange({ salary: Number(v) })}>
            <SelectTrigger id="filter-salary" className="h-10 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SALARY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          {resultCount} {resultCount === 1 ? "role" : "roles"}
          {active > 0 ? ` · ${active} filter${active === 1 ? "" : "s"} applied` : ""}
        </p>
        {(active > 0 || value.q !== defaultJobSearch.q || value.sort !== defaultJobSearch.sort) && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="mr-1.5 h-4 w-4" /> Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
