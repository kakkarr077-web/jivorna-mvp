import { Briefcase, MapPin, GraduationCap, ArrowUpRight } from "lucide-react";
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
    <article className="group relative flex flex-col gap-4 border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-lift">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-gold transition-transform duration-500 group-hover:scale-x-100"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {job.schools?.name ?? "Independent school"}
            {job.schools?.city ? ` · ${job.schools.city}` : ""}
          </p>
          <h3 className="mt-2 font-serif text-2xl leading-snug">{job.title}</h3>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold" />
      </div>

      {job.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        {job.subject && (
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-gold" /> {job.subject}
          </span>
        )}
        {job.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gold" /> {job.location}
          </span>
        )}
        {job.salary_range && (
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-gold" /> {job.salary_range}
          </span>
        )}
        <span className="ml-auto text-foreground">{job.employment_type}</span>
      </div>

      {action && <div className="pt-1">{action}</div>}
    </article>
  );
}
