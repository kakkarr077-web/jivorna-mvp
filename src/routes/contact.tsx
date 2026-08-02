import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Jivorna — Talk to Our Team" },
      {
        name: "description",
        content:
          "Questions about hiring teachers or joining as a teacher? Contact the Jivorna team and we'll respond within one working day.",
      },
      { property: "og:title", content: "Contact Jivorna" },
      { property: "og:description", content: "Talk to the Jivorna team about schools, teachers and partnerships." },
    ],
  }),
  component: Contact,
});

const details = [
  { icon: Mail, label: "Email", value: "hello@jivorna.com" },
  { icon: Phone, label: "Phone", value: "+44 20 7946 0210" },
  { icon: MapPin, label: "Office", value: "London, United Kingdom" },
];

function Contact() {
  const [sending, setSending] = useState(false);

  return (
    <PublicLayout>
      <section className="mx-auto grid max-w-6xl gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <p className="eyebrow text-gold">Contact</p>
          <h1 className="text-display mt-4 text-4xl sm:text-5xl">Let's talk</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Whether you're a school planning next term's recruitment or a teacher with a question
            about your profile, we reply within one working day.
          </p>

          <ul className="mt-10 space-y-5">
            {details.map((d) => (
              <li key={d.label} className="flex items-start gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <d.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-sm font-medium">{d.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form
          className="rounded-2xl border border-border bg-card p-7 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            setTimeout(() => {
              setSending(false);
              (e.target as HTMLFormElement).reset();
              toast.success("Thanks — we'll be in touch shortly.");
            }, 600);
          }}
        >
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required placeholder="Amara Okafor" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@school.org" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">How can we help?</Label>
              <Textarea id="message" required rows={5} placeholder="Tell us a little about your school or your teaching background." />
            </div>
            <Button type="submit" size="lg" disabled={sending}>
              {sending ? "Sending…" : "Send message"}
            </Button>
          </div>
        </form>
      </section>
    </PublicLayout>
  );
}
