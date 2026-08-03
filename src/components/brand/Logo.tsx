import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import markAsset from "@/assets/jivorna-mark.png.asset.json";

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
      <img
        src={markAsset.url}
        alt="Jivorna"
        className={cn("h-9 w-auto", tone === "light" && "brightness-0 invert")}
        loading="eager"
        width={64}
        height={64}
      />
      <span
        className={cn(
          "font-serif text-xl tracking-[0.12em] uppercase",
          tone === "dark" ? "text-foreground" : "text-primary-foreground",
        )}
      >
        Jivorna
      </span>
    </Link>
  );
}
