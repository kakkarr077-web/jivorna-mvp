# Make the contact form actually send

Today the contact form on the Contact page does nothing: it waits half a second, shows "Thanks — we'll be in touch shortly", and clears. Nothing is emailed or stored, so any enquiry sent so far is lost.

## What will change

- Every enquiry is emailed to **Info@jivorna.in** the moment someone presses Send.
- The email contains the sender's name, email, message, and the time it was sent, in a clean branded layout matching the other Jivorna emails.
- Replying to that email replies straight to the person who wrote in.
- The form shows a real success message only after the email goes out, and a clear error message if it fails, so nobody is told "sent" when it wasn't.
- Basic protection: required fields, valid email, sensible length limits, and a disabled button while sending.
- Nothing is stored in the database (per your choice, email only).

## Technical notes

- New email template `src/lib/email-templates/contact-enquiry.tsx` using the shared `_layout`, registered in `registry.ts` with a fixed `to` of Info@jivorna.in.
- New `src/lib/contact.functions.ts` with a public `createServerFn({ method: 'POST' })`, Zod-validated input (name ≤100, email ≤255, message ≤2000), calling `sendTemplateEmail` with `replyTo` set to the sender's address.
- `src/routes/contact.tsx` becomes a controlled form calling the function through `useServerFn`, with toast success/error states.
- Sends go through the already-configured `notify.jivorna.in` sender; no new keys or setup needed.
