import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { SectionHeading } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Jivorna Teacher Recruitment" },
      {
        name: "description",
        content:
          "Answers to common questions from schools and teachers about registering, verification, job approvals, applications and pricing on Jivorna.",
      },
      { property: "og:title", content: "FAQ — Jivorna Teacher Recruitment" },
      {
        property: "og:description",
        content:
          "How verification works, how long hiring takes, what it costs and how applications are tracked on Jivorna.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "How do teachers get verified?",
    a: "Teachers complete a structured profile with qualifications, subjects, experience and supporting documents. Our team reviews each submission before the profile becomes visible to schools.",
  },
  {
    q: "How quickly can a school post a vacancy?",
    a: "Posting takes a few minutes. Roles are submitted for review and our team approves and publishes them, usually within one working day.",
  },
  {
    q: "Why is my job listing showing as pending review?",
    a: "Every listing is human reviewed so teachers only see genuine, well-described roles. Once approved, the status changes to published and the role appears on the public jobs page.",
  },
  {
    q: "Can teachers track their applications?",
    a: "Yes. The teacher dashboard shows every application, its current stage, scheduled interviews and any offers, with notifications as things move.",
  },
  {
    q: "What does Jivorna cost?",
    a: "Teachers use Jivorna free of charge. Schools subscribe to a plan based on hiring volume, invoiced from the billing section of the school portal.",
  },
  {
    q: "How is my data protected?",
    a: "Documents are stored privately and profiles are only visible to verified schools once published. See our privacy policy for full detail.",
  },
];

function FaqPage() {
  return (
    <PublicLayout>
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Support"
            title="Frequently asked questions"
            description="The things schools and teachers ask us most. If your question is not here, our team is a message away."
          />
          <div className="card-premium mt-12 px-6 py-2 sm:px-8">
            <Accordion type="single" collapsible>
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left font-serif text-base text-primary">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/contact">Contact support</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/jobs" search={{}}>Browse live roles</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
