import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Reveal } from "@/components/shared/Reveal";
import { JobCard, type JobCardData } from "@/components/shared/JobCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-teacher.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jivorna — Hire Exceptional Teachers, Faster" },
      {
        name: "description",
        content:
          "Jivorna connects schools with verified, qualified educators through a streamlined recruitment process. Post roles, review vetted teachers and hire with confidence.",
      },
      { property: "og:title", content: "Jivorna — Hire Exceptional Teachers, Faster" },
      {
        property: "og:description",
        content:
          "A premium teacher recruitment platform: verified educators, transparent pipelines and dedicated portals for schools, teachers and admins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const stats = [
  { value: "4,800+", label: "Verified teachers" },
  { value: "620", label: "Partner schools" },
  { value: "9 days", label: "Median time to hire" },
  { value: "94%", label: "Offer acceptance" },
];

const steps = [
  {
    title: "Build or post in minutes",
    body: "Teachers create a living profile. Schools publish a vacancy with clear salary bands and expectations.",
  },
  {
    title: "We verify every side",
    body: "Documents, qualifications and school credentials are reviewed by our team before anything goes live.",
  },
  {
    title: "Shortlist and hire",
    body: "Track applications through review, interview and offer inside one shared, transparent pipeline.",
  },
];

const values = [
  { icon: ShieldCheck, title: "Verified on both sides", body: "Every school and teacher account is reviewed by our admin team before roles go live." },
  { icon: BadgeCheck, title: "No agency mark-up", body: "Schools speak to candidates directly. Teachers keep full control of their applications." },
  { icon: Search, title: "Signal over noise", body: "Structured profiles and roles make relevance obvious, so shortlists take hours, not weeks." },
  { icon: GraduationCap, title: "Education-only focus", body: "Built around boards, grades, subjects and academic calendars — not a generic job board." },
  { icon: CalendarCheck, title: "Interviews, organised", body: "Schedule, track and record interview outcomes without leaving the platform." },
  { icon: Sparkles, title: "A calm, premium experience", body: "A quiet interface that respects the time of principals, HR leads and teachers alike." },
];

const schools = [
  { name: "Ashcroft International", board: "IB", location: "Bengaluru", roles: 12 },
  { name: "Northfield Academy", board: "CBSE", location: "Pune", roles: 8 },
  { name: "The Meridian School", board: "ICSE", location: "Hyderabad", roles: 15 },
  { name: "Beaumont Public School", board: "CBSE", location: "Gurugram", roles: 6 },
  { name: "Riverstone Global", board: "Cambridge", location: "Chennai", roles: 9 },
  { name: "Lakeview Montessori", board: "State", location: "Kochi", roles: 4 },
];

const testimonials = [
  {
    quote:
      "We filled three senior science vacancies in under two weeks. The shortlists were genuinely relevant — no scattergun CVs.",
    name: "Dr. Ananya Rao",
    role: "Principal, Ashcroft International",
  },
  {
    quote:
      "As a teacher I finally felt seen. My profile did the work, and every school I spoke to already knew my subjects and availability.",
    name: "Imran Sheikh",
    role: "Physics Teacher, Grade 11–12",
  },
  {
    quote:
      "The interview tracking alone saved our HR team hours each week. Everything lives in one place, and nothing gets lost.",
    name: "Meera Kulkarni",
    role: "HR Lead, Northfield Academy",
  },
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
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as JobCardData[];
    },
  });

  return (
    <PublicLayout>
      {/* Hero — full-bleed ink band */}
      <section className="band-ink grid-field relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-18rem] right-[-14rem] h-[46rem] w-[46rem] rounded-full bg-gradient-gold opacity-[0.13] blur-[140px]"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 pt-20 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pt-28 lg:pb-32">
          <Reveal>
            <p className="eyebrow eyebrow-rule text-gold">Teacher recruitment, refined</p>
            <h1 className="text-display mt-8 text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
              Helping schools hire
              <br />
              <span className="italic text-gold">exceptional teachers</span>
              <br />
              faster.
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-ink-muted">
              Jivorna connects schools with verified, qualified educators through one streamlined,
              transparent recruitment process.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="gold" className="rounded-none px-8">
                <Link to="/for-schools">
                  Hire teachers <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="onDark" className="rounded-none px-8">
                <Link to="/jobs">Find teaching jobs</Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-ink-border pt-6 text-sm text-ink-muted">
              <span>620+ schools across 14 states</span>
              <span className="hidden h-4 w-px bg-ink-border sm:block" />
              <span>IB · CBSE · ICSE · Cambridge</span>
            </div>
          </Reveal>

          <Reveal delay={140} className="relative">
            <div className="relative">
              <div aria-hidden className="absolute -top-4 -left-4 h-24 w-24 border-t border-l border-gold/50" />
              <img
                src={heroImage}
                alt="A teacher standing in a bright school library"
                className="aspect-4/5 w-full object-cover shadow-ink"
                loading="eager"
              />
              <div aria-hidden className="absolute -right-4 -bottom-4 h-24 w-24 border-r border-b border-gold/50" />
            </div>
            <div className="card-ink absolute -bottom-8 -left-6 hidden w-60 p-5 sm:block">
              <p className="eyebrow text-gold">Now hiring</p>
              <p className="mt-2 font-serif text-3xl">128 live roles</p>
              <p className="mt-1 text-xs text-ink-muted">Across IB, CBSE, ICSE &amp; Cambridge</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Statistics — hairline-divided figures */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 lg:grid-cols-4 lg:px-10">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="border-b border-border/70 py-10 pr-6 lg:border-b-0 lg:border-r lg:last:border-r-0">
                <p className="font-serif text-4xl text-primary lg:text-5xl">{s.value}</p>
                <p className="mt-3 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works — ink band, numbered editorial rows */}
      <section className="band-ink py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="eyebrow eyebrow-rule text-gold">How it works</p>
                <h2 className="text-display mt-6 text-4xl sm:text-5xl">
                  A hiring process that respects everyone's time
                </h2>
              </div>
              <p className="text-base leading-relaxed text-ink-muted lg:pb-2">
                Three roles, one platform. Each portal is purpose-built for the work that role
                actually does — no generic dashboards, no wasted clicks.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 border-t border-ink-border">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div className="group grid gap-6 border-b border-ink-border py-10 md:grid-cols-[6rem_1fr_1.1fr] md:items-baseline">
                  <p className="font-serif text-3xl text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-serif text-2xl">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Jivorna */}
      <section className="bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <Reveal>
            <p className="eyebrow eyebrow-rule text-gold">Why Jivorna</p>
            <h2 className="text-display mt-6 max-w-2xl text-4xl sm:text-5xl">
              Why schools and teachers choose us
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 3) * 90}>
                <div className="h-full bg-card p-8 transition-colors hover:bg-surface lg:p-10">
                  <v.icon className="h-5 w-5 text-gold" />
                  <h3 className="mt-8 font-serif text-2xl">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured schools */}
      <section className="border-y border-border bg-surface py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow eyebrow-rule text-gold">Featured schools</p>
                <h2 className="text-display mt-6 max-w-xl text-4xl sm:text-5xl">
                  Institutions hiring on Jivorna
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                From IB world schools to fast-growing CBSE campuses — all verified before they
                publish a single role.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 border-t border-border">
            {schools.map((s, i) => (
              <Reveal key={s.name} delay={(i % 3) * 70}>
                <div className="group flex flex-wrap items-center justify-between gap-4 border-b border-border py-6 transition-colors hover:bg-background">
                  <div className="flex min-w-0 items-center gap-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-navy font-serif text-base text-primary-foreground">
                      {s.name
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-serif text-xl">{s.name}</h3>
                      <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
                        {s.board} · {s.location}
                      </p>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-gold">
                    {s.roles} open roles
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — ink band */}
      <section className="band-ink grid-field py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <Reveal>
            <p className="eyebrow eyebrow-rule text-gold">Testimonials</p>
            <h2 className="text-display mt-6 max-w-2xl text-4xl sm:text-5xl">
              What principals and teachers say
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <figure className="flex h-full flex-col border-t border-ink-border pt-8">
                  <blockquote className="flex-1 font-serif text-xl leading-relaxed text-ink-foreground">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-8">
                    <p className="text-sm text-gold">{t.name}</p>
                    <p className="mt-1 text-xs text-ink-muted">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Latest jobs */}
      <section className="bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow eyebrow-rule text-gold">Latest jobs</p>
                <h2 className="text-display mt-6 text-4xl sm:text-5xl">
                  Recently published vacancies
                </h2>
              </div>
              <Button asChild variant="ghost" className="rounded-none">
                <Link to="/jobs">
                  View all jobs <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(jobs ?? []).map((job, i) => (
              <Reveal key={job.id} delay={(i % 3) * 90}>
                <JobCard job={job} />
              </Reveal>
            ))}
            {jobs && jobs.length === 0 && (
              <div className="border border-dashed border-border p-10 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
                No roles are live right now. Schools can publish a vacancy from the school portal in
                under five minutes.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="band-ink relative overflow-hidden py-24 lg:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-gradient-gold opacity-[0.14] blur-[130px]"
        />
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-10">
          <Reveal>
            <h2 className="text-display text-4xl sm:text-5xl">
              Ready to hire — or be hired — the considered way?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted">
              Create a free account as a teacher or a school. Your dashboard is ready in seconds.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="gold" className="rounded-none px-8">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started free
                </Link>
              </Button>
              <Button asChild size="lg" variant="onDark" className="rounded-none px-8">
                <Link to="/contact">Talk to us</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
