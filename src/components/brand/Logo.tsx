import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "dark",
  to = "/",
}: {
  className?: string;
  tone?: "dark" | "light";
  to?: string;
}) {
  return (
    <Link
      to={to}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Jivorna home"
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md font-serif text-lg leading-none",
          tone === "dark" ? "bg-gradient-navy text-primary-foreground" : "bg-gradient-gold text-gold-foreground",
        )}
      >
        J
      </span>
      <span
        className={cn(
          "font-serif text-xl tracking-tight",
          tone === "dark" ? "text-foreground" : "text-primary-foreground",
        )}
      >
        Jivorna
      </span>
    </Link>
  );
}
