import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { jobStatusLabel, jobStatusTone, type JobStatus } from "@/lib/jobStatus";
import { Check, Undo2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  component: AdminJobs,
});

type Row = {
  id: string;
  title: string;
  subject: string | null;
  location: string | null;
  status: JobStatus;
  created_at: string;
  schools: { name: string } | null;
};

const FILTERS: { id: "all" | JobStatus; label: string }[] = [
  { id: "pending_review", label: "Pending review" },
  { id: "published", label: "Live" },
  { id: "draft", label: "Drafts" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
];

function AdminJobs() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | JobStatus>("pending_review");

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

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "published" ? "Vacancy approved and published." : "Vacancy sent back to the school.");
      void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update vacancy"),
  });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of data ?? []) map.set(j.status, (map.get(j.status) ?? 0) + 1);
    return map;
  }, [data]);

  const rows = useMemo(
    () => (data ?? []).filter((j) => filter === "all" || j.status === filter),
    [data, filter],
  );

  return (
    <div>
      <PageHeader
        title="All vacancies"
        description="Review roles submitted by schools and publish the ones that meet our standards."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "gold" : "outline"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id !== "all" && counts.get(f.id) ? ` (${counts.get(f.id)})` : ""}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={filter === "pending_review" ? "Nothing awaiting review" : "No vacancies here"}
          description={
            filter === "pending_review"
              ? "Roles submitted by schools will appear here for approval."
              : "Try another filter."
          }
        />

      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title}</TableCell>
                  <TableCell>{j.schools?.name ?? "—"}</TableCell>
                  <TableCell>{j.location ?? "—"}</TableCell>
                  <TableCell>{new Date(j.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={jobStatusTone(j.status)}>{jobStatusLabel(j.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {j.status === "pending_review" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="gold"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: j.id, status: "published" })}
                        >
                          <Check /> Approve &amp; publish
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: j.id, status: "draft" })}
                        >
                          <Undo2 /> Send back
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
