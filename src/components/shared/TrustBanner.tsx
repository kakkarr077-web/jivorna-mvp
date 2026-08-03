import { Lock, ShieldCheck, EyeOff, ServerCog } from "lucide-react";
import { cn } from "@/lib/utils";

const trustPoints = [
  {
    icon: Lock,
    title: "Your data is encrypted",
    body: "Profiles, documents and messages are encrypted in transit and at rest.",
  },
  {
    icon: ShieldCheck,
    title: "Every school profile is reviewed",
    body: "Institutions are verified by our team before a single role goes live.",
  },
  {
    icon: EyeOff,
    title: "Teacher applications remain private",
    body: "Only the school you apply to can see your application and documents.",
  },
  {
    icon: ServerCog,
    title: "Enterprise-grade infrastructure",
    body: "Managed hosting, row-level access control and continuous backups.",
  },
];

export function TrustBanner({
  title = "Built on trust, by design",
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("card-premium p-6 sm:p-8 lg:p-10", className)}>
      <p className="eyebrow text-gold">Security & privacy</p>
      <h2 className="mt-3 font-serif text-2xl text-primary sm:text-3xl">{title}</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {trustPoints.map((p) => (
          <li key={p.title} className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <p.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
