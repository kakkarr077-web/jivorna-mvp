import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/school/applicants")({
  component: SchoolApplicants,
});

const statuses = ["submitted", "reviewing", "shortlisted", "rejected", "hired"] as const;

type Row = {
  id: string;
  status: string;
  created_at: string;
  cover_letter: string | null;
  jobs: { title: string } | null;
};

function SchoolApplicants() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["school-applicants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: school } = await supabase.from("schools").select("id").eq("owner_id", user!.id).maybeSingle();
      if (!school) return [];
      const { data: jobs } = await supabase.from("jobs").select("id").eq("school_id", school.id);
      const ids = (jobs ?? []).map((j) => j.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("id,status,created_at,cover_letter,jobs(title)")
        .in("job_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("applications")
        .update({ status: status as Row["status"] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application updated.");
      void qc.invalidateQueries({ queryKey: ["school-applicants"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  return (
    <div>
      <PageHeader title="Applicants" description="Move candidates through your hiring pipeline." />

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No applicants yet" description="Applications to your published vacancies will appear here." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-52 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.jobs?.title ?? "—"}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Select value={r.status} onValueChange={(v) => update.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="ml-auto w-40 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
