import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { JobCard, type JobCardData } from "@/components/shared/JobCard";
import { EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Teaching Jobs — Jivorna" },
      {
        name: "description",
        content:
          "Browse current teaching vacancies from verified schools on Jivorna. Filter by subject, location and role type.",
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
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,subject,location,employment_type,salary_range,description,schools(name,city)")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as JobCardData[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((j) =>
      [j.title, j.subject, j.location, j.schools?.name].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [data, query]);

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

          <div className="mt-8 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject, school or city"
                className="h-11 bg-card pl-9"
                aria-label="Search jobs"
              />
            </div>
            <Button asChild size="lg" className="hidden sm:inline-flex">
              <Link to="/auth" search={{ mode: "signup" }}>
                Apply now
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-52 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No roles match your search"
              description="Try a different subject or city — new vacancies are published every week."
              action={
                <Button asChild variant="outline">
                  <Link to="/for-teachers">How applying works</Link>
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
      </section>
    </PublicLayout>
  );
}
