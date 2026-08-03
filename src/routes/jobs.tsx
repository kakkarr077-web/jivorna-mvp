import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { JobCard } from "@/components/shared/JobCard";
import { JobFilters } from "@/components/shared/JobFilters";
import { EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  JOB_SELECT,
  cleanJobSearch,
  defaultJobSearch,
  filterAndSortJobs,
  jobFacets,
  validateJobSearch,
  type JobSearchState,
  type SearchableJob,
} from "@/lib/job-search";

export const Route = createFileRoute("/jobs")({
  validateSearch: validateJobSearch,
  head: () => ({
    meta: [
      { title: "Teaching Jobs — Jivorna" },
      {
        name: "description",
        content:
          "Browse current teaching vacancies from verified schools on Jivorna. Filter by subject, board, salary, location and role type.",
      },
      { property: "og:title", content: "Teaching Jobs — Jivorna" },
      {
        property: "og:description",
        content: "Current teaching vacancies from verified schools, updated daily.",
      },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs" });

  const setSearch = (patch: Partial<JobSearchState>) =>
    void navigate({ search: cleanJobSearch({ ...search, ...patch }) as never, replace: true });

  const { data, isLoading } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SearchableJob[];
    },
  });

  const facets = useMemo(() => jobFacets(data ?? []), [data]);
  const filtered = useMemo(() => filterAndSortJobs(data ?? [], search), [data, search]);

  return (
    <PublicLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
          <p className="eyebrow text-gold">Open roles</p>
          <h1 className="text-display mt-4 text-4xl sm:text-5xl">Teaching vacancies</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Every role is posted directly by a verified school. Apply in one click once your teacher
            profile is complete.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <JobFilters
            value={search}
            facets={facets}
            resultCount={filtered.length}
            onChange={setSearch}
            onReset={() => setSearch(defaultJobSearch)}
          />

          <div className="mt-10">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-52 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No roles match your search"
                description="Try a different subject, board or city — new vacancies are published every week."
                action={
                  <Button variant="outline" onClick={() => setSearch(defaultJobSearch)}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    action={
                      <Button asChild size="sm" variant="outline">
                        <Link to="/auth" search={{ mode: "signup" }}>
                          Apply as teacher
                        </Link>
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

