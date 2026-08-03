import type { JobCardData } from "@/components/shared/JobCard";

export type JobSearchState = {
  q: string;
  subject: string;
  board: string;
  exp: number;
  salary: number;
  location: string;
  type: string;
  school: string;
  sort: SortKey;
};

export const SORT_KEYS = ["newest", "salary", "nearest", "relevant"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  salary: "Highest salary",
  nearest: "Nearest",
  relevant: "Most relevant",
};

export const ANY = "any";

export const defaultJobSearch: JobSearchState = {
  q: "",
  subject: ANY,
  board: ANY,
  exp: 0,
  salary: 0,
  location: ANY,
  type: ANY,
  school: ANY,
  sort: "newest",
};

const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v : fallback);
const num = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Parses URL search params into a fully-defaulted job search state. */
export function validateJobSearch(search: Record<string, unknown>): JobSearchState {
  const sort = str(search["sort"], "newest") as SortKey;
  return {
    q: str(search["q"], ""),
    subject: str(search["subject"], ANY),
    board: str(search["board"], ANY),
    exp: num(search["exp"], 0),
    salary: num(search["salary"], 0),
    location: str(search["location"], ANY),
    type: str(search["type"], ANY),
    school: str(search["school"], ANY),
    sort: SORT_KEYS.includes(sort) ? sort : "newest",
  };
}

/** Strips defaults so the URL only carries meaningful params. */
export function cleanJobSearch(state: JobSearchState): Partial<JobSearchState> {
  const out: Record<string, unknown> = {};
  (Object.keys(state) as (keyof JobSearchState)[]).forEach((k) => {
    if (state[k] !== defaultJobSearch[k]) out[k] = state[k];
  });
  return out as Partial<JobSearchState>;
}

export type SearchableJob = JobCardData & {
  board?: string | null;
  created_at?: string | null;
  min_experience_years?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  schools?: { name: string; city: string | null; board?: string | null; school_type?: string | null } | null;
};

export const JOB_SELECT =
  "id,title,subject,location,employment_type,salary_range,description,board,created_at,min_experience_years,salary_min,salary_max,schools(name,city,board,school_type)";

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

function uniqueSorted(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function jobFacets(jobs: SearchableJob[]) {
  return {
    subjects: uniqueSorted(jobs.map((j) => j.subject)),
    boards: uniqueSorted(jobs.flatMap((j) => [j.board, j.schools?.board])),
    locations: uniqueSorted(jobs.flatMap((j) => [j.location, j.schools?.city])),
    types: uniqueSorted(jobs.map((j) => j.employment_type)),
    schoolTypes: uniqueSorted(jobs.map((j) => j.schools?.school_type)),
  };
}

function jobSalary(job: SearchableJob) {
  return job.salary_max ?? job.salary_min ?? 0;
}

function relevanceScore(job: SearchableJob, q: string) {
  if (!q) return 0;
  const terms = q.split(/\s+/).filter(Boolean);
  const title = norm(job.title);
  const subject = norm(job.subject);
  const school = norm(job.schools?.name);
  const place = `${norm(job.location)} ${norm(job.schools?.city)}`;
  const body = norm(job.description);
  let score = 0;
  for (const t of terms) {
    if (title.startsWith(t)) score += 6;
    else if (title.includes(t)) score += 4;
    if (subject.includes(t)) score += 3;
    if (school.includes(t)) score += 2;
    if (place.includes(t)) score += 2;
    if (body.includes(t)) score += 1;
  }
  return score;
}

/** 0 = exact city match, 1 = partial, 2 = unknown/other. */
function proximityRank(job: SearchableJob, location: string) {
  if (location === ANY) return norm(job.schools?.city) || norm(job.location) ? 1 : 2;
  const target = norm(location);
  const places = [norm(job.location), norm(job.schools?.city)].filter(Boolean);
  if (places.some((p) => p === target)) return 0;
  if (places.some((p) => p.includes(target) || target.includes(p))) return 1;
  return 2;
}

export function filterAndSortJobs(jobs: SearchableJob[], s: JobSearchState): SearchableJob[] {
  const q = s.q.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  const filtered = jobs.filter((job) => {
    if (terms.length) {
      const haystack = [job.title, job.subject, job.location, job.description, job.schools?.name, job.schools?.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    if (s.subject !== ANY && norm(job.subject) !== norm(s.subject)) return false;
    if (s.board !== ANY && norm(job.board ?? job.schools?.board) !== norm(s.board)) return false;
    if (s.type !== ANY && norm(job.employment_type) !== norm(s.type)) return false;
    if (s.school !== ANY && norm(job.schools?.school_type) !== norm(s.school)) return false;
    if (s.location !== ANY && proximityRank(job, s.location) === 2) return false;
    if (s.exp > 0 && (job.min_experience_years ?? 0) > s.exp) return false;
    if (s.salary > 0 && jobSalary(job) < s.salary) return false;
    return true;
  });

  const byNewest = (a: SearchableJob, b: SearchableJob) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();

  const sorted = [...filtered];
  if (s.sort === "salary") sorted.sort((a, b) => jobSalary(b) - jobSalary(a) || byNewest(a, b));
  else if (s.sort === "nearest")
    sorted.sort(
      (a, b) =>
        proximityRank(a, s.location) - proximityRank(b, s.location) ||
        (norm(a.schools?.city) || norm(a.location)).localeCompare(norm(b.schools?.city) || norm(b.location)) ||
        byNewest(a, b),
    );
  else if (s.sort === "relevant")
    sorted.sort((a, b) => relevanceScore(b, q) - relevanceScore(a, q) || byNewest(a, b));
  else sorted.sort(byNewest);

  return sorted;
}

export function activeFilterCount(s: JobSearchState) {
  return (Object.keys(defaultJobSearch) as (keyof JobSearchState)[]).filter(
    (k) => k !== "sort" && k !== "q" && s[k] !== defaultJobSearch[k],
  ).length;
}
