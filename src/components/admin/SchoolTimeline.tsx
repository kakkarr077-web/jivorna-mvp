import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string | null;
  icon: LucideIcon;
};

/** Vertical activity timeline, newest first. */
export function SchoolTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 pl-6">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {events.map((e, i) => {
        const Icon = e.icon;
        return (
          <li key={e.id} className="relative">
            <span
              className={cn(
                "absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border",
                i === 0
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <p className="text-sm font-medium leading-6">{e.title}</p>
            {e.detail && <p className="text-sm text-muted-foreground">{e.detail}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(e.at).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
