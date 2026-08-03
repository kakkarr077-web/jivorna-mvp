import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, EmailLayout, detail, paragraph } from './_layout'
import type { TemplateEntry } from './registry'

export interface ApplicationReceivedProps {
  teacherName?: string
  jobTitle?: string
  schoolName?: string
}

export function ApplicationReceivedEmail({
  teacherName = 'there',
  jobTitle = 'the role',
  schoolName = 'the school',
}: ApplicationReceivedProps) {
  return (
    <EmailLayout
      preview={`Your application for ${jobTitle} has been received`}
      heading="Your application is in"
    >
      <Text style={paragraph}>Hi {teacherName},</Text>
      <Text style={paragraph}>
        We&apos;ve received your application and passed it to the school&apos;s hiring team. You can
        follow its progress from your Jivorna dashboard at any time.
      </Text>
      <DetailCard>
        <Text style={detail}>
          <strong>Role:</strong> {jobTitle}
        </Text>
        <Text style={detail}>
          <strong>School:</strong> {schoolName}
        </Text>
      </DetailCard>
      <Text style={paragraph}>
        Most schools respond within a few days. We&apos;ll email you the moment there&apos;s an
        update.
      </Text>
    </EmailLayout>
  )
}

export const template = {
  component: ApplicationReceivedEmail,
  displayName: 'Teacher — application received',
  subject: (data: Record<string, any>) =>
    `Application received: ${data['jobTitle'] ?? 'your new role'}`,
  previewData: {
    teacherName: 'Amara Okafor',
    jobTitle: 'Senior Physics Teacher',
    schoolName: 'Silverbrook International School',
  },
} satisfies TemplateEntry
