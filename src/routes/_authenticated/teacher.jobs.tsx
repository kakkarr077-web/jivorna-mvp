import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { JobCard, type JobCardData } from "@/components/shared/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";


export const Route = createFileRoute("/_authenticated/teacher/jobs")({
  component: TeacherJobs,
});

function TeacherJobs() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const qc = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["teacher-open-jobs"],
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

  const { data: applied } = useQuery({
    queryKey: ["teacher-applied-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("job_id").eq("teacher_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.job_id));
    },
  });

  const apply = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("applications").insert({ job_id: jobId, teacher_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application sent.");
      void qc.invalidateQueries({ queryKey: ["teacher-applied-ids"] });
      void qc.invalidateQueries({ queryKey: ["teacher-applications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not apply"),
  });

  const { data: savedIds } = useQuery({
    queryKey: ["teacher-saved-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_jobs").select("job_id").eq("teacher_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.job_id));
    },
  });

  const toggleSave = useMutation({
    mutationFn: async ({ jobId, saved }: { jobId: string; saved: boolean }) => {
      if (saved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("teacher_id", user!.id)
          .eq("job_id", jobId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_jobs").insert({ teacher_id: user!.id, job_id: jobId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["teacher-saved-ids"] });
      void qc.invalidateQueries({ queryKey: ["teacher-saved-jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update saved jobs"),
  });


  const q = query.trim().toLowerCase();
  const list = (jobs ?? []).filter((j) =>
    !q ? true : [j.title, j.subject, j.location, j.schools?.name].filter(Boolean).join(" ").toLowerCase().includes(q),
  );

  return (
    <div>
      <PageHeader title="Find jobs" description="Live vacancies published by verified schools." />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search roles, subjects or cities"
        className="mb-8 h-11 max-w-md bg-card"
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No roles found" description="Check back soon — schools publish new vacancies weekly." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((job) => {
            const done = applied?.has(job.id);
            const isSaved = savedIds?.has(job.id) ?? false;
            return (
              <JobCard
                key={job.id}
                job={job}
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
                      disabled={toggleSave.isPending}
                      onClick={() => toggleSave.mutate({ jobId: job.id, saved: isSaved })}
                    >
                      <Bookmark className={isSaved ? "h-4 w-4 fill-gold text-gold" : "h-4 w-4"} />
                    </Button>
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "default"}
                      disabled={done || apply.isPending}
                      onClick={() => apply.mutate(job.id)}
                    >
                      {done ? "Applied" : "Apply now"}
                    </Button>
                  </div>
                }
              />
            );
          })}

        </div>
      )}
    </div>
  );
}
