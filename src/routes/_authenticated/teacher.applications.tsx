import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { HiringTimeline, timelineStageLabel } from "@/components/shared/HiringTimeline";
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
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/teacher/applications")({
  component: TeacherApplications,
});

type Row = {
  id: string;
  status: string;
  created_at: string;
  jobs: { title: string; location: string | null; schools: { name: string } | null } | null;
};

function TeacherApplications() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id,status,created_at,jobs(title,location,schools(name))")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <div>
      <PageHeader title="My applications" description="Track the status of every role you've applied for." />

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="Nothing here yet" description="Applications you send will appear here with live status." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="min-w-[280px]">Hiring progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.jobs?.title ?? "—"}</TableCell>
                  <TableCell>{r.jobs?.schools?.name ?? "—"}</TableCell>
                  <TableCell>{r.jobs?.location ?? "—"}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <HiringTimeline status={r.status} />
                      <span className="sr-only">{timelineStageLabel(r.status)}</span>
                    </div>
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
