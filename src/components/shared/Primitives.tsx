import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={cn("eyebrow text-gold", align === "left" && "eyebrow-rule")}>{eyebrow}</p>
      )}
      <h2 className="text-display mt-5 text-3xl sm:text-4xl">{title}</h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden border border-border bg-card p-6 transition-all duration-300 hover:border-gold/50 hover:shadow-soft">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-gold transition-transform duration-500 group-hover:scale-x-100"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-gold" />}
      </div>
      <p className="mt-5 font-serif text-4xl text-primary">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <h3 className="font-serif text-2xl">{title}</h3>
      {description && <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-display text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
