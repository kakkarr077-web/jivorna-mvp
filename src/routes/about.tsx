import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { SectionHeading } from "@/components/shared/Primitives";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Jivorna — Our Mission in Education Hiring" },
      {
        name: "description",
        content:
          "Jivorna was founded to make teacher recruitment transparent, fair and fast for schools and teachers alike.",
      },
      { property: "og:title", content: "About Jivorna" },
      {
        property: "og:description",
        content: "Why we built a transparent, fee-free alternative to teacher recruitment agencies.",
      },
    ],
  }),
  component: About,
});

const principles = [
  { title: "Transparency first", body: "Salary bands, application status and school details are visible from the start." },
  { title: "Quality over volume", body: "We verify accounts on both sides so shortlists stay short and relevant." },
  { title: "Built for education", body: "Term dates, subject specialisms and safeguarding are first-class concepts, not afterthoughts." },
];

function About() {
  return (
    <PublicLayout>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <p className="eyebrow text-gold">About</p>
          <h1 className="text-display mt-4 max-w-3xl text-4xl sm:text-5xl">
            Education deserves better hiring infrastructure.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Schools lose weeks and budget to intermediaries. Teachers send CVs into silence. Jivorna
            replaces that with one shared, trustworthy platform — a teacher portal, a school portal
            and an administration layer that keeps standards high.
          </p>
        </div>
      </section>

      <section className="bg-surface py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading eyebrow="Principles" title="How we make decisions" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-card p-7">
                <h3 className="font-serif text-xl">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
