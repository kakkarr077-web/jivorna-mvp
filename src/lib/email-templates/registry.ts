import type { ComponentType } from 'react'
import { template as applicationReceived } from './application-received'
import { template as newApplication } from './new-application'
import { template as interviewInvitation } from './interview-invitation'
import { template as interviewAccepted } from './interview-accepted'
import { template as offerExtended } from './offer-extended'
import { template as jobPendingApproval } from './job-pending-approval'


export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-received': applicationReceived,
  'new-application': newApplication,
  'interview-invitation': interviewInvitation,
  'interview-accepted': interviewAccepted,
  'offer-extended': offerExtended,
  'job-pending-approval': jobPendingApproval,
}

