import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Briefcase,
  Building2,
  CalendarClock,
  Percent,
  Send,
  Trophy,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  PageHeader,
  EmptyState,
  MetricCard,
  InfoCard,
  SectionHeader,
  LoadingSkeleton,
} from "@/components/crm/CrmPrimitives";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchReportsData, REPORT_PERIODS, type ReportPeriod } from "@/lib/admin-reports";
import { titleCase } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

const growthConfig: ChartConfig = {
  schools: { label: "Schools", color: "hsl(var(--chart-1))" },
  teachers: { label: "Teachers", color: "hsl(var(--chart-2))" },
  jobs: { label: "Jobs", color: "hsl(var(--chart-3))" },
  applications: { label: "Applications", color: "hsl(var(--chart-4))" },
};

const stageConfig: ChartConfig = {
  count: { label: "Applications", color: "hsl(var(--primary))" },
};

const funnelConfig: ChartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
};

function AdminReports() {
  const [period, setPeriod] = useState<ReportPeriod>("month");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", period],
    queryFn: () => fetchReportsData(period),
  });

  const periodLabel = useMemo(
    () => REPORT_PERIODS.find((p) => p.value === period)?.label ?? "Month",
    [period],
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Marketplace performance across schools, teachers and hiring pipelines."
        action={
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <LoadingSkeleton variant="cards" rows={8} />
      ) : !data || data.isEmpty ? (
        <EmptyState
          title="No activity in this window"
          description={`There is no recorded data for the selected ${periodLabel.toLowerCase()}. Try a wider period.`}
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="New schools" value={data.kpis.schools} icon={Building2} />
            <MetricCard label="New teachers" value={data.kpis.teachers} icon={Users} />
            <MetricCard label="New jobs" value={data.kpis.jobs} icon={Briefcase} />
            <MetricCard label="New applications" value={data.kpis.applications} icon={Send} />
            <MetricCard label="Interviews" value={data.kpis.interviews} icon={CalendarClock} />
            <MetricCard label="Offers" value={data.kpis.offers} icon={Award} tone="gold" />
            <MetricCard label="Hires" value={data.kpis.hires} icon={Trophy} tone="gold" />
            <MetricCard
              label="Application → hire"
              value={`${data.kpis.conversionRate}%`}
              icon={Percent}
            />
          </div>

          <InfoCard title="Growth" description={`Activity by period (${periodLabel.toLowerCase()})`}>
            <ChartContainer config={growthConfig} className="h-72 w-full">
              <AreaChart data={data.growth}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="applications"
                  stroke="var(--color-applications)"
                  fill="var(--color-applications)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="jobs"
                  stroke="var(--color-jobs)"
                  fill="var(--color-jobs)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="teachers"
                  stroke="var(--color-teachers)"
                  fill="var(--color-teachers)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="schools"
                  stroke="var(--color-schools)"
                  fill="var(--color-schools)"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ChartContainer>
          </InfoCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard title="Applications by stage" description="Distribution across the pipeline">
              {data.stageBars.length === 0 ? (
                <EmptyState title="No applications" description="No applications in this window." />
              ) : (
                <ChartContainer config={stageConfig} className="h-72 w-full">
                  <BarChart data={data.stageBars} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      tickFormatter={(v: string) => titleCase(v)}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </InfoCard>

            <InfoCard title="Conversion funnel" description="Applications → Interviews → Offers → Hires">
              <ChartContainer config={funnelConfig} className="h-72 w-full">
                <BarChart data={data.funnel}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </InfoCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <TopList title="Top cities" rows={data.topCities} />
            <TopList title="Top subjects" rows={data.topSubjects} />
            <TopList title="Top boards" rows={data.topBoards} />
          </div>
        </div>
      )}
    </div>
  );
}

function TopList({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <InfoCard title={title}>
      {rows.length === 0 ? (
        <EmptyState title="No data" description="Nothing recorded yet." />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between text-sm">
              <span className="min-w-0 truncate">{r.name}</span>
              <span className="shrink-0 font-medium text-muted-foreground">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}
