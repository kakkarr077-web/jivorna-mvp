import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { PageHero } from "@/components/site/PageHero";
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
      <PageHero
        eyebrow="About"
        title={
          <>
            Education deserves better <span className="italic text-gold">hiring infrastructure.</span>
          </>
        }
        description="Schools lose weeks and budget to intermediaries. Teachers send CVs into silence. Jivorna replaces that with one shared, trustworthy platform — a teacher portal, a school portal and an administration layer that keeps standards high."
      />

      <section className="bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <SectionHeading eyebrow="Principles" title="How we make decisions" />
          <div className="mt-14 border-t border-border">
            {principles.map((p, i) => (
              <div
                key={p.title}
                className="grid gap-4 border-b border-border py-10 md:grid-cols-[6rem_1fr_1.2fr] md:items-baseline"
              >
                <p className="font-serif text-3xl text-gold">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="font-serif text-2xl">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

