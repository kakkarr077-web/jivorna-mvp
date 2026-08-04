import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobForm, JobPreview, emptyJob, salaryLabel, type JobFormValues } from "@/components/school/JobForm";
import type { AdminJobRow, AdminSchoolOption } from "@/lib/admin-jobs";

export const jobToValues = (j: AdminJobRow): JobFormValues => ({
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

export type JobEditorState = {
  mode: "create" | "edit" | "duplicate";
  jobId: string | null;
  schoolId: string;
  values: JobFormValues;
} | null;

export function newEditorState(schools: AdminSchoolOption[]): JobEditorState {
  return { mode: "create", jobId: null, schoolId: schools[0]?.id ?? "", values: { ...emptyJob } };
}

export function editorFromJob(job: AdminJobRow, mode: "edit" | "duplicate"): JobEditorState {
  const values = jobToValues(job);
  return {
    mode,
    jobId: mode === "edit" ? job.id : null,
    schoolId: job.school_id,
    values: mode === "duplicate" ? { ...values, title: `${values.title} (copy)`, status: "draft" } : values,
  };
}

/** Admin create / edit / duplicate dialog. Writes go through the existing admin RLS policy on jobs. */
export function AdminJobEditorDialog({
  state,
  schools,
  onClose,
}: {
  state: JobEditorState;
  schools: AdminSchoolOption[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<JobFormValues>(state?.values ?? emptyJob);
  const [schoolId, setSchoolId] = useState(state?.schoolId ?? "");

  useEffect(() => {
    if (state) {
      setValues(state.values);
      setSchoolId(state.schoolId);
    }
  }, [state]);

  const save = useMutation({
    mutationFn: async (status: JobFormValues["status"]) => {
      if (!schoolId) throw new Error("Choose the school this vacancy belongs to.");
      const payload = {
        school_id: schoolId,
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
      if (state?.mode === "edit" && state.jobId) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", state.jobId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jobs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(state?.mode === "edit" ? "Vacancy updated." : "Vacancy created.");
      void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save vacancy"),
  });

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {state?.mode === "edit" ? "Edit vacancy" : state?.mode === "duplicate" ? "Duplicate vacancy" : "New vacancy"}
          </DialogTitle>
          <DialogDescription>
            Vacancies created here are saved against the selected school. Use the row actions to publish once reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="admin-job-school">School</Label>
          <Select value={schoolId} onValueChange={setSchoolId}>
            <SelectTrigger id="admin-job-school">
              <SelectValue placeholder="Select a school" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.city ? ` · ${s.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <JobForm
          values={values}
          onChange={setValues}
          onSubmit={(status) => save.mutate(status)}
          onCancel={onClose}
          schoolName={schools.find((s) => s.id === schoolId)?.name ?? null}
          pending={save.isPending}
          submitLabel="Save vacancy"
        />
      </DialogContent>
    </Dialog>
  );
}

export function AdminJobViewDialog({ job, onClose }: { job: AdminJobRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{job?.title ?? "Vacancy"}</DialogTitle>
          <DialogDescription>{job?.schoolName}</DialogDescription>
        </DialogHeader>
        {job && <JobPreview values={jobToValues(job)} schoolName={job.schoolName} />}
      </DialogContent>
    </Dialog>
  );
}
