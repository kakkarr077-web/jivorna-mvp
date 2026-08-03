import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge, ShieldCheck, Timer, Users } from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { SectionHeading } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/for-schools")({
  head: () => ({
    meta: [
      { title: "For Schools — Jivorna" },
      {
        name: "description",
        content:
          "Publish vacancies, review vetted teacher profiles and manage your hiring pipeline from the Jivorna school portal — without agency fees.",
      },
      { property: "og:title", content: "For Schools — Jivorna" },
      {
        property: "og:description",
        content: "Post roles, shortlist vetted teachers and manage hiring in one place.",
      },
    ],
  }),
  component: ForSchools,
});

const benefits = [
  { icon: Timer, title: "Live in five minutes", body: "Create your school profile, publish a role and start receiving applications the same day." },
  { icon: Users, title: "Vetted candidates only", body: "Every teacher profile is reviewed before it can apply to a published vacancy." },
  { icon: Gauge, title: "One shared pipeline", body: "Move applicants through review, shortlist and offer with your whole leadership team." },
  { icon: ShieldCheck, title: "No placement fees", body: "A flat platform subscription replaces percentage-of-salary agency invoices." },
];

function ForSchools() {
  return (
    <PublicLayout>
      <section className="border-b border-border bg-gradient-navy">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <p className="eyebrow text-gold">For schools</p>
          <h1 className="text-display mt-4 max-w-3xl text-4xl text-primary-foreground sm:text-5xl">
            Hire teachers you'd have fought to keep.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/80">
            Publish a vacancy, review structured teacher profiles and run your entire shortlist from
            a single dashboard built for school leadership teams.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gold">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create a school account
              </Link>
            </Button>
            <Button asChild size="lg" variant="onDark">
              <Link to="/contact">Book a walkthrough</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading eyebrow="Why leadership teams switch" title="Recruitment without the mark-up" />
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-xl border border-border bg-card p-7 shadow-soft">
                <b.icon className="h-5 w-5 text-gold" />
                <h3 className="mt-5 font-serif text-xl">{b.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
