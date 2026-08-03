import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const idInput = (data: unknown) => z.object({ id: z.string().uuid() }).parse(data)

export const notifyApplicationSubmitted = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { sendApplicationSubmittedEmails } = await import('./hiring-emails.server')
    await sendApplicationSubmittedEmails(data.id)
    return { ok: true }
  })

export const notifyInterviewScheduled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { sendInterviewInvitationEmail } = await import('./hiring-emails.server')
    await sendInterviewInvitationEmail(data.id)
    return { ok: true }
  })

export const notifyInterviewAccepted = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { sendInterviewAcceptedEmail } = await import('./hiring-emails.server')
    await sendInterviewAcceptedEmail(data.id)
    return { ok: true }
  })

export const notifyOfferExtended = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { sendOfferEmail } = await import('./hiring-emails.server')
    await sendOfferEmail(data.id)
    return { ok: true }
  })

export const notifyJobPendingApproval = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { sendJobPendingApprovalEmails } = await import('./hiring-emails.server')
    await sendJobPendingApprovalEmails(data.id)
    return { ok: true }
  })
