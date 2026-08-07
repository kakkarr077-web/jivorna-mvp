import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

type Db = SupabaseClient<Database>

const idInput = (data: unknown) => z.object({ id: z.string().uuid() }).parse(data)

const forbidden = () => new Error('You do not have access to this record')

/** The caller must be the applicant, the owning school, or staff (enforced by RLS). */
async function assertApplicationAccess(supabase: Db, applicationId: string) {
  const { data } = await supabase.from('applications').select('id').eq('id', applicationId).maybeSingle()
  if (!data) throw forbidden()
}

/** Interview RLS only exposes rows to the applicant, the owning school, or staff. */
async function assertInterviewAccess(supabase: Db, interviewId: string) {
  const { data } = await supabase.from('interviews').select('id').eq('id', interviewId).maybeSingle()
  if (!data) throw forbidden()
}

/** Published jobs are world-readable, so verify school ownership (or staff) explicitly. */
async function assertJobOwnership(supabase: Db, jobId: string, userId: string) {
  const { data: job } = await supabase.from('jobs').select('school_id').eq('id', jobId).maybeSingle()
  if (!job) throw forbidden()
  const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: userId })
  if (isStaff) return
  const { data: school } = await supabase
    .from('schools')
    .select('owner_id')
    .eq('id', job.school_id)
    .maybeSingle()
  if (!school || school.owner_id !== userId) throw forbidden()
}

export const notifyApplicationSubmitted = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await assertApplicationAccess(context.supabase as Db, data.id)
    const { sendApplicationSubmittedEmails } = await import('./hiring-emails.server')
    await sendApplicationSubmittedEmails(data.id)
    return { ok: true }
  })

export const notifyInterviewScheduled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await assertInterviewAccess(context.supabase as Db, data.id)
    const { sendInterviewInvitationEmail } = await import('./hiring-emails.server')
    await sendInterviewInvitationEmail(data.id)
    return { ok: true }
  })

export const notifyInterviewAccepted = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await assertInterviewAccess(context.supabase as Db, data.id)
    const { sendInterviewAcceptedEmail } = await import('./hiring-emails.server')
    await sendInterviewAcceptedEmail(data.id)
    return { ok: true }
  })

export const notifyOfferExtended = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await assertApplicationAccess(context.supabase as Db, data.id)
    const { sendOfferEmail } = await import('./hiring-emails.server')
    await sendOfferEmail(data.id)
    return { ok: true }
  })

export const notifyJobPendingApproval = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await assertJobOwnership(context.supabase as Db, data.id, context.userId)
    const { sendJobPendingApprovalEmails } = await import('./hiring-emails.server')
    await sendJobPendingApprovalEmails(data.id)
    return { ok: true }
  })
