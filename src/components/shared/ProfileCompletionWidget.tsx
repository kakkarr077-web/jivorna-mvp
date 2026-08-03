import { Link } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ProfileCompletionSource = {
  resume_url?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  profile_photo_url?: string | null;
  subjects?: string[] | null;
} | null;

export type CompletionItem = { label: string; done: boolean };

export function profileCompletionItems(profile: ProfileCompletionSource): CompletionItem[] {
  return [
    { label: "Resume uploaded", done: !!profile?.resume_url },
    { label: "Education", done: !!profile?.qualification },
    { label: "Experience", done: (profile?.experience_years ?? 0) > 0 },
    { label: "Photo", done: !!profile?.profile_photo_url },
    { label: "Skills", done: (profile?.subjects ?? []).length > 0 },
  ];
}

export function ProfileCompletionWidget({
  profile,
  loading,
  className,
  completeHref = "/teacher/onboarding",
}: {
  profile: ProfileCompletionSource;
  loading?: boolean;
  className?: string;
  completeHref?: string;
}) {
  const items = profileCompletionItems(profile);
  const doneCount = items.filter((i) => i.done).length;
  const strength = Math.round((doneCount / items.length) * 100);

  return (
    <div className={cn("card-premium p-6", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-xl">Profile strength</h3>
        <span className="font-serif text-2xl leading-none text-primary">{strength}%</span>
      </div>

      {loading ? (
        <Skeleton className="mt-5 h-28" />
      ) : (
        <>
          <Progress value={strength} className="mt-4 h-2" />

          <ul className="mt-5 space-y-3">
            {items.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    item.done
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {item.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
                </span>
                <span className={item.done ? "text-success" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          {strength < 100 && (
            <div className="mt-6 rounded-xl border border-border bg-secondary/60 p-4">
              <p className="text-sm text-muted-foreground">
                Complete your profile to increase visibility to schools.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link to={completeHref}>Complete profile</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
