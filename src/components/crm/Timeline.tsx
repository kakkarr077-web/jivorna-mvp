import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity } from "lucide-react";
import { relativeTime } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/crm/CrmPrimitives";

export type TimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  at: string;
  icon?: LucideIcon;
  meta?: ReactNode;
};

export function Timeline({
  items,
  emptyTitle = "No activity yet",
  emptyDescription = "Actions will appear here as they happen.",
}: {
  items: TimelineItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {items.map((item) => {
        const Icon = item.icon ?? Activity;
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-[2.15rem] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-primary">
              <Icon className="h-3 w-3" />
            </span>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <p className="min-w-0 text-sm font-medium">{item.title}</p>
              <time className="shrink-0 text-xs text-muted-foreground">{relativeTime(item.at)}</time>
            </div>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            )}
            {item.meta && <div className="mt-2">{item.meta}</div>}
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityCard({
  title,
  description,
  at,
  icon: Icon = Activity,
  action,
  className,
}: {
  title: string;
  description?: string | null;
  at?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        {at && <p className="mt-1 text-xs text-muted-foreground">{relativeTime(at)}</p>}
      </div>
      {action}
    </div>
  );
}
