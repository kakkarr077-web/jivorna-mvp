import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(255),
  message: z.string().trim().min(1, 'Message is required').max(2000),
})

export type ContactInput = z.infer<typeof contactSchema>

export const submitContactEnquiry = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { sendTemplateEmail } = await import('./email-templates/send-email')

    const sentAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    })

    const result = await sendTemplateEmail('contact-enquiry', 'Info@jivorna.in', {
      templateData: {
        name: data.name,
        email: data.email,
        message: data.message,
        sentAt,
      },
      replyTo: data.email,
    })

    return { ok: result.sent }
  })
