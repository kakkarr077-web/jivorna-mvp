import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, EmailLayout, detail, paragraph } from './_layout'
import type { TemplateEntry } from './registry'

export interface InterviewInvitationProps {
  teacherName?: string
  schoolName?: string
  jobTitle?: string
  scheduledAt?: string
  mode?: string
  location?: string
}

export function InterviewInvitationEmail({
  teacherName = 'there',
  schoolName = 'The school',
  jobTitle = 'the role',
  scheduledAt = 'a time to be confirmed',
  mode,
  location,
}: InterviewInvitationProps) {
  return (
    <EmailLayout
      preview={`Interview invitation from ${schoolName}`}
      heading="You've been invited to interview"
    >
      <Text style={paragraph}>Hi {teacherName},</Text>
      <Text style={paragraph}>
        {schoolName} would like to meet you about the {jobTitle} position. Confirm the slot from
        your Jivorna dashboard so the school knows to expect you.
      </Text>
      <DetailCard>
        <Text style={detail}>
          <strong>When:</strong> {scheduledAt}
        </Text>
        {mode && (
          <Text style={detail}>
            <strong>Format:</strong> {mode}
          </Text>
        )}
        {location && (
          <Text style={detail}>
            <strong>Where:</strong> {location}
          </Text>
        )}
      </DetailCard>
      <Text style={paragraph}>
        If the time doesn&apos;t suit you, let the school know through the platform and they&apos;ll
        propose an alternative.
      </Text>
    </EmailLayout>
  )
}

export const template = {
  component: InterviewInvitationEmail,
  displayName: 'Teacher — interview invitation',
  subject: (data: Record<string, any>) =>
    `Interview invitation${data['schoolName'] ? ` from ${data['schoolName']}` : ''}`,
  previewData: {
    teacherName: 'Amara Okafor',
    schoolName: 'Silverbrook International School',
    jobTitle: 'Senior Physics Teacher',
    scheduledAt: 'Tuesday, 11 August 2026 at 10:30 AM IST',
    mode: 'Video call',
    location: 'Link shared in your dashboard',
  },
} satisfies TemplateEntry
