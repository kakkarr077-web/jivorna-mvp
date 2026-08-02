export const PIPELINE_STAGES = [
  { id: "submitted", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview_scheduled", label: "Interview Scheduled" },
  { id: "demo_class", label: "Demo Class" },
  { id: "school_review", label: "School Review" },
  { id: "offer", label: "Offer" },
  { id: "joined", label: "Joined" },
  { id: "rejected", label: "Rejected" },
] as const;

export type StageId = (typeof PIPELINE_STAGES)[number]["id"];

export const LEGACY_STAGE_MAP: Record<string, StageId> = {
  reviewing: "screening",
  shortlisted: "school_review",
  hired: "joined",
};

export const normalizeStage = (status: string): StageId =>
  (LEGACY_STAGE_MAP[status] ?? (status as StageId));

export const stageLabel = (status: string) =>
  PIPELINE_STAGES.find((s) => s.id === normalizeStage(status))?.label ?? status;

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};
