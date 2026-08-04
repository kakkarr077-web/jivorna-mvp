/**
 * Applicant Tracking System vocabulary.
 *
 * The database `application_status` enum keeps every historical value; the ATS
 * presents a normalised nine-stage pipeline on top of it. `src/lib/pipeline.ts`
 * remains the school-portal vocabulary and is deliberately left untouched.
 */
import type { Database } from "@/integrations/supabase/types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export const ATS_STAGES = [
  { id: "applied", label: "Applied", status: "submitted" },
  { id: "application_reviewed", label: "Application Reviewed", status: "reviewing" },
  { id: "phone_screening", label: "Phone Screening", status: "screening" },
  { id: "interview_scheduled", label: "Interview Scheduled", status: "interview_scheduled" },
  { id: "interview_completed", label: "Interview Completed", status: "interview_completed" },
  { id: "offer_sent", label: "Offer Sent", status: "offer" },
  { id: "offer_accepted", label: "Offer Accepted", status: "offer_accepted" },
  { id: "hired", label: "Hired", status: "hired" },
  { id: "rejected", label: "Rejected", status: "rejected" },
] as const satisfies readonly { id: string; label: string; status: ApplicationStatus }[];

export type AtsStageId = (typeof ATS_STAGES)[number]["id"];

/** Every database status mapped onto its ATS stage. */
const STATUS_TO_STAGE: Record<ApplicationStatus, AtsStageId> = {
  submitted: "applied",
  reviewing: "application_reviewed",
  shortlisted: "application_reviewed",
  screening: "phone_screening",
  interview_scheduled: "interview_scheduled",
  demo_class: "interview_completed",
  school_review: "interview_completed",
  interview_completed: "interview_completed",
  offer: "offer_sent",
  offer_accepted: "offer_accepted",
  hired: "hired",
  joined: "hired",
  rejected: "rejected",
};

export const atsStage = (status: string): AtsStageId =>
  STATUS_TO_STAGE[status as ApplicationStatus] ?? "applied";

export const atsStageLabel = (status: string) =>
  ATS_STAGES.find((s) => s.id === atsStage(status))?.label ?? status;

/** The database status written when a card is dropped into a stage. */
export const statusForStage = (stage: AtsStageId): ApplicationStatus =>
  ATS_STAGES.find((s) => s.id === stage)!.status;

export const atsStageIndex = (status: string) =>
  ATS_STAGES.findIndex((s) => s.id === atsStage(status));

export const isTerminalStage = (status: string) => atsStage(status) === "rejected";

export const atsStageTone = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  const stage = atsStage(status);
  if (stage === "rejected") return "destructive";
  if (stage === "hired" || stage === "offer_accepted") return "default";
  if (stage === "applied") return "secondary";
  return "outline";
};
