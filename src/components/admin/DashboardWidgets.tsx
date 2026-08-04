import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  ClipboardList,
  Plus,
  Target,
} from "lucide-react";
import { InfoCard, EmptyState, StatusBadge } from "@/components/crm/CrmPrimitives";
import { ActivityCard } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/crm";
import type { ActivityItem } from "@/lib/admin-activity";

export function TodaysInterviews({
  interviews,
}: {
  interviews: { id: string; scheduled_at: string; mode: string | null; jobTitle: string; candidate: string }[];
}) {
  return (
    <InfoCard title="Today's interviews" description="Scheduled interviews happening today">
      {interviews.length === 0 ? (
        <EmptyState title="No interviews today" description="Nothing scheduled for today." />
      ) : (
        <ul className="space-y-3">
          {interviews.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{i.candidate}</p>
                <p className="truncate text-xs text-muted-foreground">{i.jobTitle}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <p>{formatDateTime(i.scheduled_at)}</p>
                {i.mode && <StatusBadge label={i.mode} className="mt-1" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

export function PendingJobReviews({
  jobs,
}: {
  jobs: { id: string; title: string; schoolName: string; created_at: string }[];
}) {
  return (
    <InfoCard title="Pending job reviews" description="Vacancies waiting on moderation">
      {jobs.length === 0 ? (
        <EmptyState title="All caught up" description="No jobs are awaiting review." />
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">{j.schoolName}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/jobs">Open in Jobs</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

export function RecentCountList({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: { id: string; primary: string; secondary?: string | null; at: string }[];
}) {
  return (
    <InfoCard title={title} description={description}>
      {rows.length === 0 ? (
        <EmptyState title="Nothing new" description="No new records in the last 7 days." />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.primary}</p>
                {r.secondary && <p className="truncate text-xs text-muted-foreground">{r.secondary}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(r.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

export function RecentActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <InfoCard title="Recent activity" description="Latest events across the platform">
      {items.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions will appear here as they happen." />
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            item.href ? (
              <Link key={item.id} to={item.href} className="block">
                <ActivityCard title={item.title} description={item.description} at={item.at} icon={item.icon} />
              </Link>
            ) : (
              <ActivityCard key={item.id} title={item.title} description={item.description} at={item.at} icon={item.icon} />
            ),
          )}
        </div>
      )}
      <div className="mt-4 text-right">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/activity">View all activity</Link>
        </Button>
      </div>
    </InfoCard>
  );
}

export function UpcomingFollowUps({
  leads,
}: {
  leads: { id: string; school_name: string; next_follow_up: string; contact_person: string | null }[];
}) {
  return (
    <InfoCard title="Upcoming follow-ups" description="Leads with a follow-up due">
      {leads.length === 0 ? (
        <EmptyState title="No follow-ups due" description="Nothing scheduled from the leads pipeline." />
      ) : (
        <ul className="space-y-2">
          {leads.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{l.school_name}</p>
                {l.contact_person && <p className="truncate text-xs text-muted-foreground">{l.contact_person}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(l.next_follow_up)}</span>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

type QuickAction = { label: string; to: string; icon: LucideIcon };

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Post a job", to: "/admin/jobs", icon: Plus },
  { label: "Add lead", to: "/admin/leads", icon: Target },
  { label: "Schedule interview", to: "/admin/interviews", icon: CalendarClock },
  { label: "View reports", to: "/admin/reports", icon: ClipboardList },
];

export function QuickActions() {
  return (
    <InfoCard title="Quick actions">
      <div className="grid gap-2 sm:grid-cols-2">
        {QUICK_ACTIONS.map((a) => (
          <Button key={a.label} asChild variant="outline" className="justify-start gap-2">
            <Link to={a.to}>
              <a.icon className="h-4 w-4" />
              {a.label}
            </Link>
          </Button>
        ))}
      </div>
    </InfoCard>
  );
}
