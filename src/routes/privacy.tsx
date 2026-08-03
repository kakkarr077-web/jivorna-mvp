import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { SectionHeading } from "@/components/shared/Primitives";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Jivorna" },
      {
        name: "description",
        content:
          "How Jivorna collects, stores and protects the personal data of teachers and schools using our recruitment platform.",
      },
      { property: "og:title", content: "Privacy Policy — Jivorna" },
      {
        property: "og:description",
        content:
          "Learn what data Jivorna collects, why we collect it, how long we keep it and the rights you have over your information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "What we collect",
    body: "Teachers share profile details such as qualifications, subjects, experience, salary expectations and documents. Schools share institutional details, contact people and vacancy information. We also record basic usage data needed to keep accounts secure.",
  },
  {
    title: "How we use it",
    body: "Your data is used to match teachers with relevant roles, let schools evaluate applicants, and operate the platform — notifications, interviews, invoices and support. We never sell personal data to third parties.",
  },
  {
    title: "Who can see your profile",
    body: "Teacher profiles are visible to verified schools only after you publish them. Draft profiles and private documents remain accessible only to you and, where required, our admin review team.",
  },
  {
    title: "Retention and deletion",
    body: "We keep account data for as long as your account is active. You can delete your account at any time from Settings, after which we remove your profile and documents subject to any legal record-keeping obligations.",
  },
  {
    title: "Your rights",
    body: "You may request access to, correction of, or deletion of your personal data. Write to privacy@jivorna.com and we will respond within 30 days.",
  },
];

function PrivacyPage() {
  return (
    <PublicLayout>
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Legal"
            title="Privacy Policy"
            description="This policy explains what information Jivorna holds about you, why we hold it and how you stay in control of it."
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
            Last updated {new Date().getFullYear()}. Questions? Email privacy@jivorna.com.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
