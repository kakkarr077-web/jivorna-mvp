import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge, ShieldCheck, Timer, Users } from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { PageHero } from "@/components/site/PageHero";
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
      <PageHero
        eyebrow="For schools"
        title={
          <>
            Hire teachers you'd have <span className="italic text-gold">fought to keep.</span>
          </>
        }
        description="Publish a vacancy, review structured teacher profiles and run your entire shortlist from a single dashboard built for school leadership teams."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="gold" className="rounded-none px-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create a school account
            </Link>
          </Button>
          <Button asChild size="lg" variant="onDark" className="rounded-none px-8">
            <Link to="/contact">Book a walkthrough</Link>
          </Button>
        </div>
      </PageHero>

      <section className="bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <SectionHeading eyebrow="Why leadership teams switch" title="Recruitment without the mark-up" />
          <div className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="h-full bg-card p-8 transition-colors hover:bg-surface lg:p-10">
                <b.icon className="h-5 w-5 text-gold" />
                <h3 className="mt-8 font-serif text-2xl">{b.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

