import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JobForm, emptyJob, salaryLabel, type JobFormValues } from "@/components/school/JobForm";
import { Plus, Pencil } from "lucide-react";
import { jobStatusLabel, jobStatusTone, type JobStatus } from "@/lib/jobStatus";

export const Route = createFileRoute("/_authenticated/school/jobs")({
  component: SchoolJobs,
});

type JobRow = {
  id: string;
  title: string;
  subject: string | null;
  grade: string | null;
  board: string | null;
  location: string | null;
  employment_type: string;
  min_experience_years: number;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  benefits: string | null;
  required_skills: string[] | null;
  status: JobStatus;
};

const toValues = (j: JobRow): JobFormValues => ({
  title: j.title,
  subject: j.subject ?? "",
  grade: j.grade ?? "",
  board: j.board ?? "",
  min_experience_years: j.min_experience_years ?? 0,
  salary_min: j.salary_min != null ? String(j.salary_min) : "",
  salary_max: j.salary_max != null ? String(j.salary_max) : "",
  employment_type: j.employment_type,
  location: j.location ?? "",
  description: j.description ?? "",
  benefits: j.benefits ?? "",
  required_skills: j.required_skills ?? [],
  status: j.status,
});


function SchoolJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<JobFormValues>(emptyJob);

  const { data: school } = useQuery({
    queryKey: ["school-record", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("id,name").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["school-jobs", school?.id],
    enabled: !!school,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,subject,grade,board,location,employment_type,min_experience_years,salary_min,salary_max,description,benefits,required_skills,status",
        )
        .eq("school_id", school!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (status: JobFormValues["status"]) => {
      const payload = {
        school_id: school!.id,
        title: values.title.trim(),
        subject: values.subject.trim() || null,
        grade: values.grade || null,
        board: values.board || null,
        location: values.location.trim() || null,
        employment_type: values.employment_type,
        min_experience_years: values.min_experience_years,
        salary_min: values.salary_min ? Number(values.salary_min) : null,
        salary_max: values.salary_max ? Number(values.salary_max) : null,
        salary_range: salaryLabel(values),
        description: values.description.trim() || null,
        benefits: values.benefits.trim() || null,
        required_skills: values.required_skills,
        status,
      };
      if (editingId) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jobs").insert(payload);
        if (error) throw error;
      }
      return status;
    },
    onSuccess: (status) => {
      toast.success(
        status === "pending_review"
          ? "Submitted for review — our admin team will publish it once approved."
          : `Vacancy saved as ${jobStatusLabel(status).toLowerCase()}.`,
      );
      setOpen(false);
      setEditingId(null);
      setValues(emptyJob);
      void qc.invalidateQueries({ queryKey: ["school-jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save vacancy"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobRow["status"] }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["school-jobs"] }),
  });

  if (school === null) {
    return (
      <div>
        <PageHeader title="Vacancies" />
        <EmptyState
          title="Create your school profile first"
          description="Vacancies are published under your school's name."
          action={
            <Button asChild>
              <Link to="/school/profile">Go to school profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (open) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title={editingId ? "Edit vacancy" : "Post a vacancy"}
          description="Fill in the details, preview how candidates will see it, then save a draft or submit it for admin review."
        />
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <JobForm
            values={values}
            onChange={setValues}
            onSubmit={(status) => save.mutate(status)}
            onCancel={() => {
              setOpen(false);
              setEditingId(null);
              setValues(emptyJob);
            }}
            schoolName={school?.name}
            pending={save.isPending}
            submitLabel={editingId ? "Save changes" : "Submit for review"}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Vacancies" description="Everything you've posted — drafts, live roles and closed positions." />
      <div className="mb-6">
        <Button
          variant="gold"
          onClick={() => {
            setValues(emptyJob);
            setEditingId(null);
            setOpen(true);
          }}
        >
          <Plus /> Post a vacancy
        </Button>
      </div>

      {(jobs ?? []).length === 0 ? (
        <EmptyState title="No vacancies yet" description="Post your first role to start receiving applications." />
      ) : (
        <ul className="grid gap-4">
          {(jobs ?? []).map((j) => (
            <li key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg">{j.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[j.subject, j.grade, j.board, j.location, j.employment_type, salaryLabel(toValues(j))]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Badge variant={jobStatusTone(j.status)}>{jobStatusLabel(j.status)}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setValues(toValues(j));
                    setEditingId(j.id);
                    setOpen(true);
                  }}
                >
                  <Pencil /> Edit
                </Button>
                {(j.status === "draft" || j.status === "closed") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus.mutate({ id: j.id, status: "pending_review" })}
                  >
                    Submit for review
                  </Button>
                )}
                {j.status === "pending_review" && (
                  <span className="self-center text-xs text-muted-foreground">
                    Awaiting admin approval
                  </span>
                )}
                {j.status !== "closed" && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: j.id, status: "closed" })}>
                    Close role
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
