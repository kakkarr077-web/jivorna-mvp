import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, EmailLayout, detail, paragraph } from './_layout'
import type { TemplateEntry } from './registry'

export interface ContactEnquiryProps {
  name?: string
  email?: string
  message?: string
  sentAt?: string
}

export function ContactEnquiryEmail({
  name = 'Someone',
  email = 'unknown',
  message = '',
  sentAt = '',
}: ContactEnquiryProps) {
  return (
    <EmailLayout
      preview={`New contact enquiry from ${name}`}
      heading="New contact enquiry"
    >
      <Text style={paragraph}>
        A visitor submitted the contact form on the Jivorna website.
      </Text>
      <DetailCard>
        <Text style={detail}>
          <strong>Name:</strong> {name}
        </Text>
        <Text style={detail}>
          <strong>Email:</strong> {email}
        </Text>
        {sentAt ? (
          <Text style={detail}>
            <strong>Received:</strong> {sentAt}
          </Text>
        ) : null}
      </DetailCard>
      <Text style={{ ...paragraph, whiteSpace: 'pre-wrap' }}>{message}</Text>
      <Text style={paragraph}>Reply to this email to respond directly to {name}.</Text>
    </EmailLayout>
  )
}

export const template = {
  component: ContactEnquiryEmail,
  displayName: 'Internal — contact form enquiry',
  subject: (data: Record<string, any>) =>
    `New contact enquiry from ${data['name'] ?? 'a website visitor'}`,
  to: 'Info@jivorna.in',
  previewData: {
    name: 'Amara Okafor',
    email: 'amara@school.org',
    message: 'We are hiring three science teachers for next term. Can you help?',
    sentAt: '7 September 2026 at 4:45 pm',
  },
} satisfies TemplateEntry
