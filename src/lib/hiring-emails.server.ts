// Server-only helpers that resolve recipients for hiring emails and send them
// through the managed email API. Never import from client components.
import { sendTemplateEmail } from './email-templates/send-email'

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

async function loadApplicationContext(applicationId: string) {
  const db = await admin()
  const { data: application } = await db
    .from('applications')
    .select('id, teacher_id, job_id')
    .eq('id', applicationId)
    .maybeSingle()
  if (!application) return null

  const [{ data: job }, { data: teacher }, { data: teacherProfile }] = await Promise.all([
    db
      .from('jobs')
      .select('id, title, subject, location, salary_range, school_id')
      .eq('id', application.job_id)
      .maybeSingle(),
    db.from('profiles').select('email, full_name').eq('id', application.teacher_id).maybeSingle(),
    db
      .from('teacher_profiles')
      .select('full_name, email, experience_years, subjects')
      .eq('user_id', application.teacher_id)
      .maybeSingle(),
  ])
  if (!job) return null

  const { data: school } = await db
    .from('schools')
    .select('id, name, contact_email, owner_id')
    .eq('id', job.school_id)
    .maybeSingle()

  let schoolEmail = school?.contact_email ?? null
  if (!schoolEmail && school?.owner_id) {
    const { data: owner } = await db
      .from('profiles')
      .select('email')
      .eq('id', school.owner_id)
      .maybeSingle()
    schoolEmail = owner?.email ?? null
  }

  return {
    application,
    job,
    school,
    schoolEmail,
    teacherEmail: teacherProfile?.email ?? teacher?.email ?? null,
    teacherName: teacherProfile?.full_name ?? teacher?.full_name ?? 'there',
    experienceYears: teacherProfile?.experience_years,
    subjects: (teacherProfile?.subjects ?? []).join(', '),
  }
}

/** Teacher confirmation + school notification when an application is submitted. */
export async function sendApplicationSubmittedEmails(applicationId: string) {
  const ctx = await loadApplicationContext(applicationId)
  if (!ctx) return

  if (ctx.teacherEmail) {
    await sendTemplateEmail('application-received', ctx.teacherEmail, {
      templateData: {
        teacherName: ctx.teacherName,
        jobTitle: ctx.job.title,
        schoolName: ctx.school?.name ?? 'the school',
      },
      idempotencyKey: `application-received-${applicationId}`,
    })
  }

  if (ctx.schoolEmail) {
    await sendTemplateEmail('new-application', ctx.schoolEmail, {
      templateData: {
        schoolName: ctx.school?.name ?? 'there',
        teacherName: ctx.teacherName,
        jobTitle: ctx.job.title,
        experienceYears: ctx.experienceYears,
        subjects: ctx.subjects,
      },
      idempotencyKey: `new-application-${applicationId}`,
    })
  }
}

/** Teacher invitation when an interview is scheduled. */
export async function sendInterviewInvitationEmail(interviewId: string) {
  const db = await admin()
  const { data: interview } = await db
    .from('interviews')
    .select('id, application_id, scheduled_at, mode, location, meeting_url')
    .eq('id', interviewId)
    .maybeSingle()
  if (!interview) return

  const ctx = await loadApplicationContext(interview.application_id)
  if (!ctx?.teacherEmail) return

  await sendTemplateEmail('interview-invitation', ctx.teacherEmail, {
    templateData: {
      teacherName: ctx.teacherName,
      schoolName: ctx.school?.name ?? 'The school',
      jobTitle: ctx.job.title,
      scheduledAt: fmtDate(interview.scheduled_at),
      mode: interview.mode,
      location: interview.location ?? interview.meeting_url ?? undefined,
    },
    idempotencyKey: `interview-invitation-${interviewId}`,
  })
}

/** School notification when a teacher confirms an interview. */
export async function sendInterviewAcceptedEmail(interviewId: string) {
  const db = await admin()
  const { data: interview } = await db
    .from('interviews')
    .select('id, application_id, scheduled_at')
    .eq('id', interviewId)
    .maybeSingle()
  if (!interview) return

  const ctx = await loadApplicationContext(interview.application_id)
  if (!ctx?.schoolEmail) return

  await sendTemplateEmail('interview-accepted', ctx.schoolEmail, {
    templateData: {
      schoolName: ctx.school?.name ?? 'there',
      teacherName: ctx.teacherName,
      jobTitle: ctx.job.title,
      scheduledAt: fmtDate(interview.scheduled_at),
    },
    idempotencyKey: `interview-accepted-${interviewId}`,
  })
}

/** Teacher notification when an offer is extended. */
export async function sendOfferEmail(applicationId: string) {
  const ctx = await loadApplicationContext(applicationId)
  if (!ctx?.teacherEmail) return

  await sendTemplateEmail('offer-extended', ctx.teacherEmail, {
    templateData: {
      teacherName: ctx.teacherName,
      schoolName: ctx.school?.name ?? 'The school',
      jobTitle: ctx.job.title,
      salary: ctx.job.salary_range ?? undefined,
    },
    idempotencyKey: `offer-extended-${applicationId}`,
  })
}

/** Admin alert when a school submits a job for review. */
export async function sendJobPendingApprovalEmails(jobId: string) {
  const db = await admin()
  const { data: job } = await db
    .from('jobs')
    .select('id, title, subject, location, school_id')
    .eq('id', jobId)
    .maybeSingle()
  if (!job) return

  const [{ data: school }, { data: adminRoles }] = await Promise.all([
    db.from('schools').select('name').eq('id', job.school_id).maybeSingle(),
    db.from('user_roles').select('user_id').eq('role', 'admin'),
  ])

  const adminIds = (adminRoles ?? []).map((r) => r.user_id)
  if (adminIds.length === 0) return

  const { data: admins } = await db.from('profiles').select('email').in('id', adminIds)
  const emails = (admins ?? []).map((a) => a.email).filter((e): e is string => Boolean(e))

  for (const email of emails) {
    await sendTemplateEmail('job-pending-approval', email, {
      templateData: {
        jobTitle: job.title,
        schoolName: school?.name ?? 'A school',
        subject: job.subject ?? undefined,
        location: job.location ?? undefined,
      },
      idempotencyKey: `job-pending-approval-${jobId}-${email}`,
    })
  }
}
