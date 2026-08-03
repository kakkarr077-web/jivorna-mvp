import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, EmailLayout, detail, paragraph } from './_layout'
import type { TemplateEntry } from './registry'

export interface OfferExtendedProps {
  teacherName?: string
  schoolName?: string
  jobTitle?: string
  salary?: string
}

export function OfferExtendedEmail({
  teacherName = 'there',
  schoolName = 'The school',
  jobTitle = 'the role',
  salary,
}: OfferExtendedProps) {
  return (
    <EmailLayout
      preview={`You have an offer from ${schoolName}`}
      heading="Congratulations — you have an offer"
    >
      <Text style={paragraph}>Hi {teacherName},</Text>
      <Text style={paragraph}>
        {schoolName} has extended an offer for the {jobTitle} position. Full details are waiting in
        your Jivorna dashboard.
      </Text>
      <DetailCard>
        <Text style={detail}>
          <strong>Role:</strong> {jobTitle}
        </Text>
        <Text style={detail}>
          <strong>School:</strong> {schoolName}
        </Text>
        {salary && (
          <Text style={detail}>
            <strong>Package:</strong> {salary}
          </Text>
        )}
      </DetailCard>
      <Text style={paragraph}>
        Review the offer and respond through the platform so the school can plan your onboarding.
      </Text>
    </EmailLayout>
  )
}

export const template = {
  component: OfferExtendedEmail,
  displayName: 'Teacher — offer extended',
  subject: (data: Record<string, any>) =>
    `You have an offer${data['schoolName'] ? ` from ${data['schoolName']}` : ''}`,
  previewData: {
    teacherName: 'Amara Okafor',
    schoolName: 'Silverbrook International School',
    jobTitle: 'Senior Physics Teacher',
    salary: '₹9,00,000 – ₹12,00,000 per annum',
  },
} satisfies TemplateEntry
