import { Loader2 } from "lucide-react";

/**
 * Full-viewport loading state used while auth/role checks resolve, so a
 * portal shell is never mounted before we know the visitor belongs there.
 */
export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-surface"
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
