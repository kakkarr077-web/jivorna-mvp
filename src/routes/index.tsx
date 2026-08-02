import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Building2, ClipboardCheck, Search, ShieldCheck, Users } from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { SectionHeading } from "@/components/shared/Primitives";
import { JobCard, type JobCardData } from "@/components/shared/JobCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-teacher.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jivorna — Teacher Recruitment, Refined" },
      {
        name: "description",
        content:
          "Jivorna is a premium teacher recruitment platform connecting schools with qualified teachers. Post roles, review vetted candidates and hire with confidence.",
      },
      { property: "og:title", content: "Jivorna — Teacher Recruitment, Refined" },
      {
        property: "og:description",
        content:
          "A modern hiring platform for schools and teachers, with dedicated portals for teachers, schools and administrators.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  {
    icon: Users,
    title: "Teachers build a profile",
    body: "Subjects, experience, availability and a short professional summary — no CV black holes.",
  },
  {
    icon: Building2,
    title: "Schools post roles",
    body: "Publish a vacancy in minutes with clear salary bands and expectations.",
  },
  {
    icon: ClipboardCheck,
    title: "Matches move forward",
    body: "Track every application through review, shortlist and offer in one shared pipeline.",
  },
];

const values = [
  { icon: ShieldCheck, title: "Verified on both sides", body: "Every school and teacher account is reviewed by our admin team before roles go live." },
  { icon: BadgeCheck, title: "No agency mark-up", body: "Schools speak to candidates directly. Teachers keep control of their applications." },
  { icon: Search, title: "Signal over noise", body: "Structured profiles and roles make relevance obvious, so shortlists take hours, not weeks." },
];

function Index() {
  const { data: jobs } = useQuery({
    queryKey: ["featured-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,subject,location,employment_type,salary_range,description,schools(name,city)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as unknown as JobCardData[];
    },
  });

  return (
    <PublicLayout>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div>
            <p className="eyebrow text-gold">Teacher recruitment, refined</p>
            <h1 className="text-display mt-5 text-4xl sm:text-5xl lg:text-6xl">
              Where great schools meet <span className="text-gold">great teachers</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Jivorna is a modern hiring platform built for education. Schools publish roles,
              teachers apply with a living profile, and every conversation stays in one calm,
              transparent place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create your account <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/jobs">Browse open roles</Link>
              </Button>
            </div>

            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-8">
              {[
                ["4,800+", "Vetted teachers"],
                ["620", "Partner schools"],
                ["9 days", "Median time to hire"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-serif text-2xl text-primary">{value}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-navy opacity-[0.06]" />
            <img
              src={heroImage}
              alt="A teacher standing in a bright school library"
              className="aspect-4/5 w-full rounded-2xl object-cover shadow-lift"
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="A hiring process that respects everyone's time"
            description="Three roles, one platform. Each portal is purpose-built for the work that role actually does."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-7 shadow-soft">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="eyebrow mt-6 text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-2 font-serif text-xl">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Latest roles" title="Recently published vacancies" />
            <Button asChild variant="ghost">
              <Link to="/jobs">
                View all jobs <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(jobs ?? []).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {jobs && jobs.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
                No roles are live right now. Schools can publish a vacancy from the school portal in
                under five minutes.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading eyebrow="Why Jivorna" title="Trust is the product" align="center" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-border bg-card p-7">
                <v.icon className="h-5 w-5 text-gold" />
                <h3 className="mt-5 font-serif text-xl">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-gradient-navy px-8 py-14 text-center shadow-lift sm:px-14">
            <h2 className="text-display mx-auto max-w-2xl text-3xl text-primary-foreground sm:text-4xl">
              Ready to hire — or be hired — the considered way?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/75">
              Create a free account as a teacher or a school. Your dashboard is ready in seconds.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="gold">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
              <Button asChild size="lg" variant="onDark">
                <Link to="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
