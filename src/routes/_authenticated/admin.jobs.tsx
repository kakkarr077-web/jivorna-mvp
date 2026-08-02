import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  component: AdminJobs,
});

type Row = {
  id: string;
  title: string;
  subject: string | null;
  location: string | null;
  status: string;
  created_at: string;
  schools: { name: string } | null;
};

function AdminJobs() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,subject,location,status,created_at,schools(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <div>
      <PageHeader title="All vacancies" description="Every role posted across the platform." />
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No vacancies yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title}</TableCell>
                  <TableCell>{j.schools?.name ?? "—"}</TableCell>
                  <TableCell>{j.location ?? "—"}</TableCell>
                  <TableCell>{new Date(j.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="capitalize">
                      {j.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
