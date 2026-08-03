import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeStage } from "@/lib/pipeline";

export const TIMELINE_STAGES = [
  { id: "applied", label: "Applied" },
  { id: "viewed", label: "Viewed" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
] as const;

export type TimelineStageId = (typeof TIMELINE_STAGES)[number]["id"];

const STAGE_BY_STATUS: Record<string, TimelineStageId | "rejected"> = {
  submitted: "applied",
  screening: "viewed",
  school_review: "shortlisted",
  interview_scheduled: "interview",
  demo_class: "interview",
  offer: "offer",
  joined: "offer",
  rejected: "rejected",
};

export function timelineStage(status: string): TimelineStageId | "rejected" {
  return STAGE_BY_STATUS[normalizeStage(status)] ?? "applied";
}

export function timelineStageLabel(status: string) {
  const stage = timelineStage(status);
  if (stage === "rejected") return "Rejected";
  return TIMELINE_STAGES.find((s) => s.id === stage)?.label ?? "Applied";
}

type Props = {
  status: string;
  /** compact hides stage labels — use inside dense lists */
  compact?: boolean;
  className?: string;
};

export function HiringTimeline({ status, compact = false, className }: Props) {
  const stage = timelineStage(status);
  const rejected = stage === "rejected";
  const currentIndex = rejected
    ? TIMELINE_STAGES.length
    : TIMELINE_STAGES.findIndex((s) => s.id === stage);

  return (
    <div
      className={cn("flex items-center", compact ? "gap-0" : "gap-0 w-full", className)}
      role="group"
      aria-label={`Hiring stage: ${timelineStageLabel(status)}`}
    >
      {TIMELINE_STAGES.map((s, i) => {
        const done = !rejected && i < currentIndex;
        const current = !rejected && i === currentIndex;
        const dimmed = rejected || i > currentIndex;

        return (
          <div key={s.id} className={cn("flex items-center", !compact && "flex-1 last:flex-none")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center justify-center rounded-full border transition-all duration-300",
                  compact ? "h-4 w-4" : "h-7 w-7",
                  done && "border-primary bg-primary text-primary-foreground",
                  current &&
                    "border-secondary bg-secondary text-secondary-foreground shadow-[0_0_0_4px_color-mix(in_oklab,var(--secondary)_22%,transparent)]",
                  dimmed && "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} strokeWidth={3} />
                ) : (
                  <span
                    className={cn(
                      "rounded-full",
                      compact ? "h-1.5 w-1.5" : "h-2 w-2",
                      current ? "bg-secondary-foreground" : "bg-muted-foreground/50",
                    )}
                  />
                )}
              </span>
              {!compact && (
                <span
                  className={cn(
                    "whitespace-nowrap text-[11px] font-medium tracking-wide",
                    current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              )}
            </div>

            {i < TIMELINE_STAGES.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-px rounded-full transition-colors duration-300",
                  compact ? "w-4" : "min-w-6 flex-1 -mt-5",
                  !rejected && i < currentIndex ? "bg-primary" : "bg-border",
                )}
                style={compact ? undefined : { flexGrow: 1 }}
              />
            )}
          </div>
        );
      })}

      {rejected && (
        <span
          className={cn(
            "ml-3 inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 font-medium text-destructive",
            compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
          )}
        >
          <X className="h-3 w-3" strokeWidth={3} />
          Rejected
        </span>
      )}
    </div>
  );
}
