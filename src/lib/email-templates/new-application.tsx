import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, EmailLayout, detail, paragraph } from './_layout'
import type { TemplateEntry } from './registry'

export interface NewApplicationProps {
  schoolName?: string
  teacherName?: string
  jobTitle?: string
  experienceYears?: string | number
  subjects?: string
}

export function NewApplicationEmail({
  schoolName = 'there',
  teacherName = 'A candidate',
  jobTitle = 'your open role',
  experienceYears,
  subjects,
}: NewApplicationProps) {
  return (
    <EmailLayout
      preview={`New applicant for ${jobTitle}`}
      heading="You have a new applicant"
    >
      <Text style={paragraph}>Hi {schoolName},</Text>
      <Text style={paragraph}>
        {teacherName} has applied for one of your published roles. Review the profile and move the
        candidate through your hiring pipeline whenever you&apos;re ready.
      </Text>
      <DetailCard>
        <Text style={detail}>
          <strong>Candidate:</strong> {teacherName}
        </Text>
        <Text style={detail}>
          <strong>Role:</strong> {jobTitle}
        </Text>
        {experienceYears !== undefined && (
          <Text style={detail}>
            <strong>Experience:</strong> {experienceYears} years
          </Text>
        )}
        {subjects && (
          <Text style={detail}>
            <strong>Subjects:</strong> {subjects}
          </Text>
        )}
      </DetailCard>
      <Text style={paragraph}>Open your applicants board in Jivorna to screen and shortlist.</Text>
    </EmailLayout>
  )
}

export const template = {
  component: NewApplicationEmail,
  displayName: 'School — new application',
  subject: (data: Record<string, any>) =>
    `New applicant for ${data['jobTitle'] ?? 'your open role'}`,
  previewData: {
    schoolName: 'Silverbrook International School',
    teacherName: 'Amara Okafor',
    jobTitle: 'Senior Physics Teacher',
    experienceYears: 8,
    subjects: 'Physics, Mathematics',
  },
} satisfies TemplateEntry
