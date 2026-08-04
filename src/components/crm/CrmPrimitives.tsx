import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/* Re-exported so every CRM module imports from one place. */
export { PageHeader, EmptyState, StatCard, SectionHeading } from "@/components/shared/Primitives";

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "gold" | "muted";
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "rounded-xl border border-border bg-card p-5 text-left shadow-soft transition-colors",
        onClick && "hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              tone === "gold" ? "bg-gold-soft text-gold" : "bg-primary-soft text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-serif text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Wrapper>
  );
}

export type BadgeTone = "default" | "secondary" | "outline" | "destructive";

export function StatusBadge({
  label,
  tone = "outline",
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <Badge variant={tone} className={cn("whitespace-nowrap", className)}>
      {label}
    </Badge>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="font-serif text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function InfoCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            {title && <h3 className="font-serif text-lg">{title}</h3>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value ?? "Not recorded"}</span>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterToolbar({
  children,
  onReset,
  right,
}: {
  children: ReactNode;
  onReset?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">{children}</div>
      {(onReset || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onReset ? (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset filters
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">{right}</div>
        </div>
      )}
    </div>
  );
}

export function BulkActionsToolbar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="flex flex-wrap gap-2">{children}</div>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}

export function LoadingSkeleton({
  variant = "table",
  rows = 6,
  className,
}: {
  variant?: "table" | "cards" | "profile" | "lines";
  rows?: number;
  className?: string;
}) {
  if (variant === "cards") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  if (variant === "profile") {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }
  if (variant === "lines") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded" />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <Skeleton className="h-11 w-full rounded-none" />
      <div className="space-y-px p-px">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
