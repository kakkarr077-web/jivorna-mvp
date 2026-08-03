import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, EmailLayout, detail, paragraph } from './_layout'
import type { TemplateEntry } from './registry'

export interface JobPendingApprovalProps {
  jobTitle?: string
  schoolName?: string
  subject?: string
  location?: string
}

export function JobPendingApprovalEmail({
  jobTitle = 'A new role',
  schoolName = 'a school',
  subject,
  location,
}: JobPendingApprovalProps) {
  return (
    <EmailLayout
      preview={`${jobTitle} is awaiting review`}
      heading="A job is awaiting review"
    >
      <Text style={paragraph}>
        {schoolName} has submitted a vacancy for approval. It stays hidden from teachers until an
        administrator publishes it.
      </Text>
      <DetailCard>
        <Text style={detail}>
          <strong>Role:</strong> {jobTitle}
        </Text>
        <Text style={detail}>
          <strong>School:</strong> {schoolName}
        </Text>
        {subject && (
          <Text style={detail}>
            <strong>Subject:</strong> {subject}
          </Text>
        )}
        {location && (
          <Text style={detail}>
            <strong>Location:</strong> {location}
          </Text>
        )}
      </DetailCard>
      <Text style={paragraph}>Open the admin jobs queue to approve or send it back.</Text>
    </EmailLayout>
  )
}

export const template = {
  component: JobPendingApprovalEmail,
  displayName: 'Admin — job pending approval',
  subject: (data: Record<string, any>) =>
    `Review required: ${data['jobTitle'] ?? 'a new job posting'}`,
  previewData: {
    jobTitle: 'Senior Physics Teacher',
    schoolName: 'Silverbrook International School',
    subject: 'Physics',
    location: 'Pune, Maharashtra',
  },
} satisfies TemplateEntry
