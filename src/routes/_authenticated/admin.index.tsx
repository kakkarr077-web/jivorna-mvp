import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, Send, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/Primitives";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const countOf = async (table: "profiles" | "schools" | "jobs" | "applications") => {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
};

function AdminOverview() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => ({
      users: await countOf("profiles"),
      schools: await countOf("schools"),
      jobs: await countOf("jobs"),
      applications: await countOf("applications"),
    }),
  });

  return (
    <div>
      <PageHeader title="Platform overview" description="Health of the Jivorna marketplace." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered users" value={data?.users ?? "—"} icon={Users} />
        <StatCard label="Schools" value={data?.schools ?? "—"} icon={Building2} />
        <StatCard label="Vacancies" value={data?.jobs ?? "—"} icon={Briefcase} />
        <StatCard label="Applications" value={data?.applications ?? "—"} icon={Send} />
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card p-7">
        <h2 className="font-serif text-xl">Moderation notes</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Admin accounts can read every profile, school, vacancy and application. Role assignment is
          stored separately from profiles, so elevating a user to admin is a deliberate database
          action rather than something a user can self-serve.
        </p>
      </div>
    </div>
  );
}
