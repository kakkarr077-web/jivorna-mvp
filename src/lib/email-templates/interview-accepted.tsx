import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, EmailLayout, detail, paragraph } from './_layout'
import type { TemplateEntry } from './registry'

export interface InterviewAcceptedProps {
  schoolName?: string
  teacherName?: string
  jobTitle?: string
  scheduledAt?: string
}

export function InterviewAcceptedEmail({
  schoolName = 'there',
  teacherName = 'The candidate',
  jobTitle = 'your open role',
  scheduledAt = 'the scheduled time',
}: InterviewAcceptedProps) {
  return (
    <EmailLayout
      preview={`${teacherName} confirmed the interview`}
      heading="Interview confirmed"
    >
      <Text style={paragraph}>Hi {schoolName},</Text>
      <Text style={paragraph}>
        {teacherName} has confirmed the interview for the {jobTitle} position.
      </Text>
      <DetailCard>
        <Text style={detail}>
          <strong>Candidate:</strong> {teacherName}
        </Text>
        <Text style={detail}>
          <strong>Role:</strong> {jobTitle}
        </Text>
        <Text style={detail}>
          <strong>When:</strong> {scheduledAt}
        </Text>
      </DetailCard>
      <Text style={paragraph}>
        The interview appears on your dashboard schedule — no further action needed.
      </Text>
    </EmailLayout>
  )
}

export const template = {
  component: InterviewAcceptedEmail,
  displayName: 'School — interview accepted',
  subject: (data: Record<string, any>) =>
    `${data['teacherName'] ?? 'A candidate'} confirmed the interview`,
  previewData: {
    schoolName: 'Silverbrook International School',
    teacherName: 'Amara Okafor',
    jobTitle: 'Senior Physics Teacher',
    scheduledAt: 'Tuesday, 11 August 2026 at 10:30 AM IST',
  },
} satisfies TemplateEntry
