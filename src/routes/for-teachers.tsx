import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, FileText, Sparkles, Wallet } from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { PageHero } from "@/components/site/PageHero";
import { SectionHeading } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/for-teachers")({
  head: () => ({
    meta: [
      { title: "For Teachers — Jivorna" },
      {
        name: "description",
        content:
          "Build one professional teaching profile, apply to verified schools in a click and track every application from your Jivorna teacher dashboard.",
      },
      { property: "og:title", content: "For Teachers — Jivorna" },
      {
        property: "og:description",
        content: "One profile, direct applications to verified schools, and a clear view of your pipeline.",
      },
    ],
  }),
  component: ForTeachers,
});

const benefits = [
  { icon: FileText, title: "One living profile", body: "Update subjects, experience and availability once — every application stays current." },
  { icon: Sparkles, title: "Direct to decision makers", body: "No agency intermediary. Your application lands with the school's hiring lead." },
  { icon: CalendarCheck, title: "Transparent status", body: "See exactly where you are: submitted, reviewing, shortlisted or offered." },
  { icon: Wallet, title: "Salary up front", body: "Every role publishes a salary band, so you never waste a conversation." },
];

function ForTeachers() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="For teachers"
        title={
          <>
            Your next classroom, <span className="italic text-gold">found on your terms.</span>
          </>
        }
        description="Jivorna gives teachers a professional profile that works harder than a CV, and a dashboard that shows exactly what's happening with every application."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="gold" className="rounded-none px-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create a teacher account
            </Link>
          </Button>
          <Button asChild size="lg" variant="onDark" className="rounded-none px-8">
            <Link to="/jobs">See open roles</Link>
          </Button>
        </div>
      </PageHero>

      <section className="bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <SectionHeading eyebrow="What you get" title="Built around the way teachers actually job hunt" />
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

