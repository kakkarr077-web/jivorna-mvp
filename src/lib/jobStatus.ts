export type JobStatus = "draft" | "pending_review" | "published" | "closed";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  pending_review: "In review",
  published: "Live",
  closed: "Closed",
};

export const JOB_STATUS_TONES: Record<JobStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  pending_review: "outline",
  published: "default",
  closed: "outline",
};

export function jobStatusLabel(status: string) {
  return JOB_STATUS_LABELS[status as JobStatus] ?? status;
}

export function jobStatusTone(status: string) {
  return JOB_STATUS_TONES[status as JobStatus] ?? "secondary";
}
