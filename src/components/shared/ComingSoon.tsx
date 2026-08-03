import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/Primitives";

export function ComingSoon({
  title,
  description,
  icon: Icon,
  note,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  note?: string;
}) {
  return (
    <div>
      <PageHeader title={title} {...(description ? { description } : {})} />
      <div className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-20 text-center">
        {Icon && (
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <p className="eyebrow text-gold">In development</p>
        <h2 className="text-display mt-3 text-3xl">Coming Soon</h2>
        {note && (
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{note}</p>
        )}
      </div>
    </div>
  );
}
