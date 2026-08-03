import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const NAVY = '#0A2E63'
const GOLD = '#B08A3C'
const BG = '#FAFAF8'
const TEXT = '#1E293B'
const MUTED = '#64748B'

export interface EmailLayoutProps {
  preview: string
  heading: string
  children: React.ReactNode
}

export function EmailLayout({ preview, heading, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BG,
          margin: 0,
          padding: '32px 0',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
          color: TEXT,
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E7E5E0',
            overflow: 'hidden',
          }}
        >
          <Section style={{ backgroundColor: NAVY, padding: '22px 32px' }}>
            <Text
              style={{
                margin: 0,
                color: '#FFFFFF',
                fontSize: '20px',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              JIVORNA
            </Text>
            <Text style={{ margin: '4px 0 0', color: GOLD, fontSize: '12px' }}>
              Teacher recruitment, done properly
            </Text>
          </Section>

          <Section style={{ padding: '32px' }}>
            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '22px',
                lineHeight: '1.3',
                fontWeight: 600,
                color: NAVY,
              }}
            >
              {heading}
            </Text>
            {children}
          </Section>

          <Hr style={{ borderColor: '#E7E5E0', margin: 0 }} />
          <Section style={{ padding: '20px 32px' }}>
            <Text style={{ margin: 0, fontSize: '12px', color: MUTED }}>
              You are receiving this because of activity on your Jivorna account.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const paragraph: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: TEXT,
}

export const detail: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '14px',
  lineHeight: '1.6',
  color: MUTED,
}

export function DetailCard({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: '#F4F5F7',
        borderRadius: '10px',
        padding: '16px 18px',
        margin: '0 0 18px',
      }}
    >
      {children}
    </Section>
  )
}

export const brand = { NAVY, GOLD, BG, TEXT, MUTED }
