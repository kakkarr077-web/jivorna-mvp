import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { SectionHeading } from "@/components/shared/Primitives";
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

type PlatformStats = {
  teacher_count: number;
  school_count: number;
  live_job_count: number;
};

// Live counts come from the database; the two benchmark figures below are
// illustrative targets and are labelled as such until we have enough hiring
// history to calculate them.
const illustrativeStats = [
  { icon: CalendarCheck, value: "9 days", label: "Median time to hire" },
  { icon: BadgeCheck, value: "94%", label: "Offer acceptance rate" },
];

const trustBadges = [
  { icon: CheckCircle2, label: "Verified Schools" },
  { icon: CheckCircle2, label: "Verified Teachers" },
  { icon: CheckCircle2, label: "Secure Applications" },
  { icon: CheckCircle2, label: "Human Reviewed Jobs" },
];


const steps = [
  {
    icon: Users,
    title: "Build or post in minutes",
    body: "Teachers create a living profile. Schools publish a vacancy with clear salary bands and expectations.",
  },
  {
    icon: ShieldCheck,
    title: "We verify every side",
    body: "Documents, qualifications and school credentials are reviewed before anything goes live.",
  },
  {
    icon: ClipboardCheck,
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
  { icon: Sparkles, title: "Premium, calm experience", body: "A quiet interface that respects the time of principals, HR leads and teachers alike." },
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
  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_stats");
      if (error) throw error;
      return (data?.[0] ?? null) as PlatformStats | null;
    },
  });

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

  const liveStats = [
    {
      icon: Users,
      value: stats ? stats.teacher_count.toLocaleString("en-IN") : "—",
      label: "Verified teachers",
    },
    {
      icon: Building2,
      value: stats ? stats.school_count.toLocaleString("en-IN") : "—",
      label: "Partner schools",
    },
  ];


  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 h-[38rem] w-[38rem] rounded-full bg-gradient-navy opacity-[0.05] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-40 h-[32rem] w-[32rem] rounded-full bg-gradient-gold opacity-[0.07] blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <Reveal>
            <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft px-3 py-1.5 text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Teacher recruitment, refined
            </p>
            <h1 className="text-display mt-6 text-4xl sm:text-5xl lg:text-[3.6rem]">
              India's Recruitment Platform Built{" "}
              <span className="text-gold">Exclusively for Schools</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Helping schools hire verified teachers faster while helping teachers discover
              trusted opportunities across India.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full shadow-soft">
                <Link to="/for-schools">
                  Hire Teachers <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/jobs">Find Teaching Jobs</Link>
              </Button>
            </div>
            <ul className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:gap-4">
              {trustBadges.map((b) => (
                <li
                  key={b.label}
                  className="flex items-center gap-2.5 rounded-full border border-border bg-card/70 px-3.5 py-2 text-sm text-foreground shadow-soft"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
                    <b.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{b.label}</span>
                </li>
              ))}
            </ul>

          </Reveal>

          <Reveal delay={120} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-navy opacity-[0.06]" />
            <img
              src={heroImage}
              alt="A teacher standing in a bright school library"
              className="aspect-4/5 w-full rounded-3xl object-cover shadow-lift"
              loading="eager"
            />
            <div className="card-premium absolute -bottom-6 -left-4 hidden w-56 p-4 sm:block">
              <p className="eyebrow text-gold">Now hiring</p>
              <p className="mt-2 font-serif text-2xl text-primary">
                {stats ? `${stats.live_job_count} live roles` : "Live roles"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Across IB, CBSE, ICSE & Cambridge</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Statistics */}
      <section className="border-b border-border bg-surface py-16">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {liveStats.map((s, i) => (
              <Reveal key={s.label} delay={i * 90}>
                <div className="card-premium card-premium-hover h-full p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-5 font-serif text-3xl text-primary sm:text-4xl">{s.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </div>
              </Reveal>
            ))}
            {illustrativeStats.map((s, i) => (
              <Reveal key={s.label} delay={(i + 2) * 90}>
                <div className="card-premium h-full p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted-foreground">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-5 font-serif text-3xl text-muted-foreground sm:text-4xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                  <p className="eyebrow mt-3 text-muted-foreground">Illustrative target</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Teacher and school counts are live platform figures. Median time to hire and offer
            acceptance rate are illustrative targets, not measured results — we will publish
            verified figures once we have enough completed hires to calculate them.
          </p>
        </div>
      </section>


      {/* How It Works */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="A hiring process that respects everyone's time"
              description="Three roles, one platform. Each portal is purpose-built for the work that role actually does."
              align="center"
            />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 110}>
                <div className="card-premium card-premium-hover h-full p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-navy text-primary-foreground shadow-soft">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <p className="eyebrow mt-6 text-muted-foreground">Step {i + 1}</p>
                  <h3 className="mt-2 font-serif text-xl">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Jivorna */}
      <section className="border-y border-border bg-surface py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Why Jivorna" title="Why schools and teachers choose us" align="center" />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 3) * 100}>
                <div className="card-premium card-premium-hover h-full p-7">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold">
                    <v.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-serif text-xl">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Schools */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Featured schools"
              title="Institutions hiring on Jivorna"
              description="From IB world schools to fast-growing CBSE campuses — all verified before they publish."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {schools.map((s, i) => (
              <Reveal key={s.name} delay={(i % 3) * 100}>
                <div className="card-premium card-premium-hover flex h-full items-center gap-4 p-6">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-navy font-serif text-lg text-primary-foreground">
                    {s.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-lg">{s.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.board} · {s.location}
                    </p>
                    <p className="mt-2 text-xs font-medium text-gold">{s.roles} open roles</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border bg-surface py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Testimonials" title="What principals and teachers say" align="center" />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 110}>
                <figure className="card-premium card-premium-hover flex h-full flex-col p-7">
                  <Quote className="h-6 w-6 text-gold" />
                  <blockquote className="mt-5 flex-1 font-serif text-lg leading-relaxed text-foreground">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 border-t border-border pt-5">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Jobs */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading eyebrow="Latest jobs" title="Recently published vacancies" />
              <Button asChild variant="ghost">
                <Link to="/jobs">
                  View all jobs <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(jobs ?? []).map((job, i) => (
              <Reveal key={job.id} delay={(i % 3) * 100}>
                <JobCard job={job} />
              </Reveal>
            ))}
            {jobs && jobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
                No roles are live right now. Schools can publish a vacancy from the school portal in
                under five minutes.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="pb-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-navy px-8 py-16 text-center shadow-lift sm:px-14">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-gradient-gold opacity-20 blur-3xl"
              />
              <h2 className="text-display mx-auto max-w-2xl text-3xl text-primary-foreground sm:text-4xl">
                Ready to hire — or be hired — the considered way?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/75">
                Create a free account as a teacher or a school. Your dashboard is ready in seconds.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="gold" className="rounded-full">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get started free
                  </Link>
                </Button>
                <Button asChild size="lg" variant="onDark" className="rounded-full">
                  <Link to="/contact">Talk to us</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
