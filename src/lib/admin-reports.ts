import { supabase } from "@/integrations/supabase/client";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subWeeks,
  subMonths,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";

export type ReportPeriod = "week" | "month" | "quarter" | "year";

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

type Granularity = "day" | "week" | "month";

function periodConfig(period: ReportPeriod): { start: Date; granularity: Granularity } {
  const now = new Date();
  switch (period) {
    case "week":
      return { start: startOfDay(subDays(now, 6)), granularity: "day" };
    case "month":
      return { start: startOfDay(subDays(now, 29)), granularity: "day" };
    case "quarter":
      return { start: startOfWeek(subWeeks(now, 12)), granularity: "week" };
    case "year":
    default:
      return { start: startOfMonth(subMonths(now, 11)), granularity: "month" };
  }
}

function bucketKey(iso: string, granularity: Granularity) {
  const d = new Date(iso);
  if (granularity === "day") return format(startOfDay(d), "yyyy-MM-dd");
  if (granularity === "week") return format(startOfWeek(d), "yyyy-MM-dd");
  return format(startOfMonth(d), "yyyy-MM");
}

function bucketList(start: Date, granularity: Granularity) {
  const now = new Date();
  if (granularity === "day") return eachDayOfInterval({ start, end: now }).map((d) => ({ key: format(d, "yyyy-MM-dd"), label: format(d, "d MMM") }));
  if (granularity === "week") return eachWeekOfInterval({ start, end: now }).map((d) => ({ key: format(d, "yyyy-MM-dd"), label: format(d, "d MMM") }));
  return eachMonthOfInterval({ start, end: now }).map((d) => ({ key: format(d, "yyyy-MM"), label: format(d, "MMM yy") }));
}

export type ReportsData = {
  kpis: {
    schools: number;
    teachers: number;
    jobs: number;
    applications: number;
    interviews: number;
    offers: number;
    hires: number;
    conversionRate: number;
  };
  growth: { label: string; schools: number; teachers: number; jobs: number; applications: number }[];
  stageBars: { stage: string; count: number }[];
  funnel: { stage: string; count: number }[];
  topCities: { name: string; count: number }[];
  topSubjects: { name: string; count: number }[];
  topBoards: { name: string; count: number }[];
  isEmpty: boolean;
};

const OFFER_STATUSES = new Set(["offer"]);
const HIRE_STATUSES = new Set(["hired", "joined"]);

export async function fetchReportsData(period: ReportPeriod): Promise<ReportsData> {
  const { start, granularity } = periodConfig(period);
  const startIso = start.toISOString();

  const [
    { data: schools },
    { data: teachers },
    { data: jobs },
    { data: applications },
    { data: interviews },
  ] = await Promise.all([
    supabase.from("schools").select("id,city,board,created_at"),
    supabase.from("teacher_profiles").select("user_id,city,subjects,created_at"),
    supabase.from("jobs").select("id,subject,board,status,created_at"),
    supabase.from("applications").select("id,status,created_at"),
    supabase.from("interviews").select("id,created_at,scheduled_at"),
  ]);

  const schoolsInWindow = (schools ?? []).filter((s) => s.created_at >= startIso);
  const teachersInWindow = (teachers ?? []).filter((t) => t.created_at >= startIso);
  const jobsInWindow = (jobs ?? []).filter((j) => j.created_at >= startIso);
  const applicationsInWindow = (applications ?? []).filter((a) => a.created_at >= startIso);
  const interviewsInWindow = (interviews ?? []).filter((i) => i.created_at >= startIso);
  const offersInWindow = applicationsInWindow.filter((a) => OFFER_STATUSES.has(a.status));
  const hiresInWindow = applicationsInWindow.filter((a) => HIRE_STATUSES.has(a.status));

  const conversionRate = applicationsInWindow.length
    ? Math.round((hiresInWindow.length / applicationsInWindow.length) * 1000) / 10
    : 0;

  const buckets = bucketList(start, granularity);
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
  const growth = buckets.map((b) => ({ label: b.label, schools: 0, teachers: 0, jobs: 0, applications: 0 }));

  for (const s of schoolsInWindow) {
    const idx = bucketIndex.get(bucketKey(s.created_at, granularity));
    if (idx !== undefined) growth[idx].schools += 1;
  }
  for (const t of teachersInWindow) {
    const idx = bucketIndex.get(bucketKey(t.created_at, granularity));
    if (idx !== undefined) growth[idx].teachers += 1;
  }
  for (const j of jobsInWindow) {
    const idx = bucketIndex.get(bucketKey(j.created_at, granularity));
    if (idx !== undefined) growth[idx].jobs += 1;
  }
  for (const a of applicationsInWindow) {
    const idx = bucketIndex.get(bucketKey(a.created_at, granularity));
    if (idx !== undefined) growth[idx].applications += 1;
  }

  const stageOrder = [
    "submitted",
    "screening",
    "reviewing",
    "interview_scheduled",
    "demo_class",
    "school_review",
    "shortlisted",
    "offer",
    "hired",
    "joined",
    "rejected",
  ];
  const stageCounts = new Map<string, number>();
  for (const a of applicationsInWindow) stageCounts.set(a.status, (stageCounts.get(a.status) ?? 0) + 1);
  const stageBars = stageOrder
    .filter((s) => stageCounts.has(s))
    .map((s) => ({ stage: s, count: stageCounts.get(s) ?? 0 }));

  const funnel = [
    { stage: "Applications", count: applicationsInWindow.length },
    { stage: "Interviews", count: interviewsInWindow.length },
    { stage: "Offers", count: offersInWindow.length },
    { stage: "Hires", count: hiresInWindow.length },
  ];

  const countTop = (values: (string | null | undefined)[]) => {
    const map = new Map<string, number>();
    for (const v of values) {
      if (!v) continue;
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const topCities = countTop((teachers ?? []).map((t) => t.city));
  const topSubjects = countTop((teachers ?? []).flatMap((t) => t.subjects ?? []));
  const topBoards = countTop((schools ?? []).map((s) => s.board));

  const isEmpty =
    schoolsInWindow.length === 0 &&
    teachersInWindow.length === 0 &&
    jobsInWindow.length === 0 &&
    applicationsInWindow.length === 0 &&
    interviewsInWindow.length === 0;

  return {
    kpis: {
      schools: schoolsInWindow.length,
      teachers: teachersInWindow.length,
      jobs: jobsInWindow.length,
      applications: applicationsInWindow.length,
      interviews: interviewsInWindow.length,
      offers: offersInWindow.length,
      hires: hiresInWindow.length,
      conversionRate,
    },
    growth,
    stageBars,
    funnel,
    topCities,
    topSubjects,
    topBoards,
    isEmpty,
  };
}
