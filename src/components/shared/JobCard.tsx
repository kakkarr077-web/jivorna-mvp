import { Briefcase, MapPin, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

export type JobCardData = {
  id: string;
  title: string;
  subject: string | null;
  location: string | null;
  employment_type: string;
  salary_range: string | null;
  description: string | null;
  schools?: { name: string; city: string | null } | null;
};

export function JobCard({ job, action }: { job: JobCardData; action?: ReactNode }) {
  return (
    <article className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-xl leading-snug">{job.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.schools?.name ?? "Independent school"}
            {job.schools?.city ? ` · ${job.schools.city}` : ""}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 bg-gold-soft text-accent-foreground">
          {job.employment_type}
        </Badge>
      </div>

      {job.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {job.subject && (
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> {job.subject}
          </span>
        )}
        {job.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {job.location}
          </span>
        )}
        {job.salary_range && (
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" /> {job.salary_range}
          </span>
        )}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </article>
  );
}
