import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, FileText, Sparkles, Wallet } from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
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
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <p className="eyebrow text-gold">For teachers</p>
          <h1 className="text-display mt-4 max-w-3xl text-4xl sm:text-5xl">
            Your next classroom, found on your terms.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Jivorna gives teachers a professional profile that works harder than a CV, and a
            dashboard that shows exactly what's happening with every application.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create a teacher account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/jobs" search={{}}>See open roles</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-surface py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading eyebrow="What you get" title="Built around the way teachers actually job hunt" />
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
