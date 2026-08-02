import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, Users } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/school/")({
  component: SchoolOverview,
});

function SchoolOverview() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["school-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: school } = await supabase
        .from("schools")
        .select("id,name")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (!school) return { school: null, jobs: [], applications: [] };

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id,title,status,created_at")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });

      const jobIds = (jobs ?? []).map((j) => j.id);
      const { data: applications } = jobIds.length
        ? await supabase
            .from("applications")
            .select("id,status,created_at,job_id,jobs(title)")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false })
        : { data: [] };

      return { school, jobs: jobs ?? [], applications: applications ?? [] };
    },
  });

  if (data && !data.school) {
    return (
      <div>
        <PageHeader title="Welcome to Jivorna" description="First, tell us about your school." />
        <EmptyState
          title="Set up your school profile"
          description="Add your school details so you can publish vacancies and receive applications."
          action={
            <Button asChild>
              <Link to="/school/profile">Create school profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const jobs = data?.jobs ?? [];
  const applications = (data?.applications ?? []) as { id: string; status: string; jobs: { title: string } | null }[];
  const published = jobs.filter((j) => j.status === "published").length;

  return (
    <div>
      <PageHeader
        title={data?.school?.name ?? "School overview"}
        description="Your vacancies and candidate pipeline at a glance."
        action={
          <Button asChild>
            <Link to="/school/jobs">Post a vacancy</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Live vacancies" value={published} icon={Briefcase} />
        <StatCard label="Total applications" value={applications.length} icon={Users} />
        <StatCard
          label="Shortlisted"
          value={applications.filter((a) => a.status === "shortlisted").length}
          icon={CheckCircle2}
        />
      </div>

      <h2 className="mt-12 mb-4 font-serif text-xl">Latest applicants</h2>
      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Publish a vacancy and qualified teachers will start applying."
          action={
            <Button asChild variant="outline">
              <Link to="/school/jobs">Manage vacancies</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {applications.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <p className="font-medium">{a.jobs?.title ?? "Role"}</p>
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
