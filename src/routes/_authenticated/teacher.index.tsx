import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, Send, Star } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/teacher/")({
  component: TeacherOverview,
});

type AppRow = {
  id: string;
  status: string;
  created_at: string;
  jobs: { title: string; schools: { name: string } | null } | null;
};

function TeacherOverview() {
  const { user } = useAuth();

  const { data: applications } = useQuery({
    queryKey: ["teacher-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id,status,created_at,jobs(title,schools(name))")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AppRow[];
    },
  });

  const { data: openJobs } = useQuery({
    queryKey: ["open-jobs-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const rows = applications ?? [];
  const shortlisted = rows.filter((r) => r.status === "shortlisted" || r.status === "hired").length;

  return (
    <div>
      <PageHeader
        title="Your teaching search"
        description="Everything you've applied for, and everything you could."
        action={
          <Button asChild>
            <Link to="/teacher/jobs">Find new roles</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Applications sent" value={rows.length} icon={Send} />
        <StatCard label="Shortlisted or hired" value={shortlisted} icon={Star} />
        <StatCard label="Open roles on Jivorna" value={openJobs ?? "—"} icon={Briefcase} />
        <StatCard label="Profile status" value="Active" icon={CheckCircle2} hint="Visible to verified schools" />
      </div>

      <h2 className="mt-12 mb-4 font-serif text-xl">Recent applications</h2>
      {rows.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Browse published vacancies and apply with your Jivorna profile in one click."
          action={
            <Button asChild>
              <Link to="/teacher/jobs">Browse roles</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.slice(0, 5).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium">{a.jobs?.title ?? "Role"}</p>
                <p className="text-xs text-muted-foreground">{a.jobs?.schools?.name ?? "School"}</p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {a.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
