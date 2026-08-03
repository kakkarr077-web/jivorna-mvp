import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Building2, Globe, Mail, Phone, Send, Users } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/Primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { VERIFICATION_LABEL, verificationVariant } from "@/lib/admin-schools";

export const Route = createFileRoute("/_authenticated/admin/schools/$schoolId")({
  component: AdminSchoolDetail,
});

function AdminSchoolDetail() {
  const { schoolId } = useParams({ from: "/_authenticated/admin/schools/$schoolId" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-school", schoolId],
    queryFn: async () => {
      const { data: school, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .maybeSingle();
      if (error) throw error;
      if (!school) return null;

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id,title,subject,status,location,employment_type,created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      const jobIds = (jobs ?? []).map((j) => j.id);
      let applications = 0;
      if (jobIds.length) {
        const { count } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("job_id", jobIds);
        applications = count ?? 0;
      }
      return { school, jobs: jobs ?? [], applications };
    },
  });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!data)
    return (
      <EmptyState
        title="School not found"
        description="This record may have been removed."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/schools">Back to schools</Link>
          </Button>
        }
      />
    );

  const { school, jobs, applications } = data;
  const active = jobs.filter((j) => j.status === "published").length;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/admin/schools">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All schools
        </Link>
      </Button>

      <PageHeader
        title={school.name}
        description={school.tagline || [school.board, school.city].filter(Boolean).join(" · ") || undefined}
        action={
          <Badge variant={verificationVariant(school.subscription_status)}>
            {VERIFICATION_LABEL[school.subscription_status]}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active jobs" value={active} icon={Briefcase} />
        <StatCard label="Total jobs" value={jobs.length} icon={Building2} />
        <StatCard label="Applications" value={applications} icon={Send} />
        <StatCard label="Students" value={school.student_count ?? "—"} icon={Users} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-serif text-xl">Contact</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Principal", school.principal_name],
              ["HR contact", school.hr_name],
              ["Board", school.board],
              ["School type", school.school_type],
              ["City", school.city],
              ["Joined", new Date(school.created_at).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{(value as string) || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> {school.phone || "—"}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{school.contact_email || "—"}</span>
            </p>
            <p className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{school.website || "—"}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="font-serif text-xl">About</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {school.description || "No description provided yet."}
          </p>

          <h3 className="mt-8 font-serif text-lg">Job postings</h3>
          {jobs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">This school has not posted any roles yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.title}</TableCell>
                      <TableCell>{j.subject || "—"}</TableCell>
                      <TableCell>{j.location || "—"}</TableCell>
                      <TableCell className="capitalize">{j.employment_type}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="capitalize">
                          {j.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
