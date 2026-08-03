import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { SectionHeading } from "@/components/shared/Primitives";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Jivorna" },
      {
        name: "description",
        content:
          "The terms that govern the use of Jivorna by teachers and schools, including account rules, job listings, fees and acceptable use.",
      },
      { property: "og:title", content: "Terms of Service — Jivorna" },
      {
        property: "og:description",
        content:
          "Account eligibility, listing standards, payment terms and acceptable use rules for the Jivorna teacher recruitment platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "Accounts",
    body: "Teachers and schools may register directly; admin accounts are provisioned by Jivorna. You are responsible for the accuracy of the information you supply and for keeping your credentials secure.",
  },
  {
    title: "Job listings",
    body: "Every vacancy is reviewed by our team before it goes live. Listings must describe a genuine role with an honest salary range and must not discriminate on any protected ground.",
  },
  {
    title: "Applications and hiring",
    body: "Jivorna facilitates introductions and manages the hiring pipeline. Employment contracts are agreed directly between the school and the teacher, and both parties remain responsible for their own obligations.",
  },
  {
    title: "Fees and invoices",
    body: "Schools on paid plans are invoiced according to their subscription. Invoices are payable within the stated period; overdue accounts may have posting privileges paused until settled.",
  },
  {
    title: "Acceptable use",
    body: "Do not misrepresent your identity, scrape the platform, or contact users for purposes unrelated to teaching recruitment. We may suspend accounts that breach these terms.",
  },
  {
    title: "Changes",
    body: "We may update these terms as the platform evolves. Material changes are communicated by email before they take effect.",
  },
];

function TermsPage() {
  return (
    <PublicLayout>
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Legal"
            title="Terms of Service"
            description="These terms set out what you can expect from Jivorna and what we expect from schools and teachers using the platform."
          />
          <div className="mt-12 space-y-8">
            {sections.map((s) => (
              <div key={s.title} className="card-premium p-6 sm:p-8">
                <h2 className="font-serif text-xl text-primary">{s.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-xs text-muted-foreground">
            Last updated {new Date().getFullYear()}. Questions? Email legal@jivorna.com.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
