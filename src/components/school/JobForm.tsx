import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Pencil, X } from "lucide-react";
import { jobStatusLabel, type JobStatus } from "@/lib/jobStatus";

export type JobFormValues = {
  title: string;
  subject: string;
  grade: string;
  board: string;
  min_experience_years: number;
  salary_min: string;
  salary_max: string;
  employment_type: string;
  location: string;
  description: string;
  benefits: string;
  required_skills: string[];
  status: JobStatus;
};

export const emptyJob: JobFormValues = {
  title: "",
  subject: "",
  grade: "",
  board: "",
  min_experience_years: 0,
  salary_min: "",
  salary_max: "",
  employment_type: "Full-time",
  location: "",
  description: "",
  benefits: "",
  required_skills: [],
  status: "draft",
};

export const BOARDS = ["CBSE", "ICSE", "IB", "IGCSE", "State Board", "Other"];
export const GRADES = ["Pre-primary", "Primary", "Middle school", "Secondary", "Senior secondary"];
export const JOB_TYPES = ["Full-time", "Part-time", "Fixed-term", "Contract", "Supply"];

export function validateJob(v: JobFormValues) {
  const errors: Partial<Record<keyof JobFormValues, string>> = {};
  if (v.title.trim().length < 3) errors.title = "Give the role a title of at least 3 characters.";
  if (!v.subject.trim()) errors.subject = "Subject is required.";
  if (!v.grade) errors.grade = "Select a grade level.";
  if (!v.location.trim()) errors.location = "Location is required.";
  if (v.min_experience_years < 0 || v.min_experience_years > 50) errors.min_experience_years = "Enter 0–50 years.";
  const min = Number(v.salary_min);
  const max = Number(v.salary_max);
  if (v.salary_min && (Number.isNaN(min) || min < 0)) errors.salary_min = "Enter a valid amount.";
  if (v.salary_max && (Number.isNaN(max) || max < 0)) errors.salary_max = "Enter a valid amount.";
  if (v.salary_min && v.salary_max && max < min) errors.salary_max = "Maximum must be above the minimum.";
  if ((v.status === "published" || v.status === "pending_review") && v.description.trim().length < 40)
    errors.description = "Roles submitted for review need a description of at least 40 characters.";
  return errors;
}

export function salaryLabel(v: Pick<JobFormValues, "salary_min" | "salary_max">) {
  if (v.salary_min && v.salary_max) return `${Number(v.salary_min).toLocaleString()} – ${Number(v.salary_max).toLocaleString()}`;
  if (v.salary_min) return `From ${Number(v.salary_min).toLocaleString()}`;
  if (v.salary_max) return `Up to ${Number(v.salary_max).toLocaleString()}`;
  return "Salary on application";
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function JobPreview({ values, schoolName }: { values: JobFormValues; schoolName?: string | null | undefined }) {
  return (
    <article className="rounded-2xl border border-border bg-background p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl">{values.title || "Untitled role"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {[schoolName, values.location].filter(Boolean).join(" · ") || "Your school"}
          </p>
        </div>
        <Badge variant="secondary">{jobStatusLabel(values.status)}</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Subject", values.subject],
          ["Grade", values.grade],
          ["Board", values.board],
          ["Job type", values.employment_type],
          ["Experience", `${values.min_experience_years}+ years`],
          ["Salary", salaryLabel(values)],
        ].map(([k, val]) => (
          <div key={k} className="rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
            <p className="text-sm font-medium">{val || "—"}</p>
          </div>
        ))}
      </div>

      {values.required_skills.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Required skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {values.required_skills.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {values.description && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Job description</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{values.description}</p>
        </div>
      )}

      {values.benefits && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Benefits</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{values.benefits}</p>
        </div>
      )}
    </article>
  );
}

export function JobForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  schoolName,
  pending,
  submitLabel = "Save",
}: {
  values: JobFormValues;
  onChange: (v: JobFormValues) => void;
  onSubmit: (status: JobFormValues["status"]) => void;
  onCancel?: () => void;
  schoolName?: string | null | undefined;
  pending?: boolean;
  submitLabel?: string;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormValues, string>>>({});
  const [preview, setPreview] = useState(false);
  const [skill, setSkill] = useState("");
  const set = <K extends keyof JobFormValues>(k: K, v: JobFormValues[K]) => onChange({ ...values, [k]: v });

  const attempt = (status: JobFormValues["status"]) => {
    const next = { ...values, status };
    const errs = validateJob(next);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit(status);
  };

  const addSkill = () => {
    const s = skill.trim();
    if (!s || values.required_skills.includes(s)) return setSkill("");
    set("required_skills", [...values.required_skills, s]);
    setSkill("");
  };

  if (preview) {
    return (
      <div className="grid gap-4">
        <JobPreview values={values} schoolName={schoolName} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPreview(false)}>
            <Pencil /> Back to editing
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => attempt("draft")}>
            Save draft
          </Button>
          <Button
            variant="gold"
            disabled={pending}
            onClick={() => attempt(values.status === "published" ? "published" : "pending_review")}
          >
            {values.status === "published" ? "Save changes" : "Submit for review"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        attempt(values.status === "closed" || values.status === "published" ? values.status : "pending_review");
      }}
    >
      <Field label="Role title" htmlFor="title" error={errors.title}>
        <Input id="title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="Teacher of Physics" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Subject" htmlFor="subject" error={errors.subject}>
          <Input id="subject" value={values.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Physics" />
        </Field>
        <Field label="Grade" error={errors.grade}>
          <Select value={values.grade} onValueChange={(v) => set("grade", v)}>
            <SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Board / curriculum">
          <Select value={values.board} onValueChange={(v) => set("board", v)}>
            <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
            <SelectContent>
              {BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Job type">
          <Select value={values.employment_type} onValueChange={(v) => set("employment_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Minimum experience (years)" htmlFor="exp" error={errors.min_experience_years}>
          <Input
            id="exp"
            type="number"
            min={0}
            max={50}
            value={values.min_experience_years}
            onChange={(e) => set("min_experience_years", Number(e.target.value))}
          />
        </Field>
        <Field label="Location" htmlFor="location" error={errors.location}>
          <Input id="location" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Bengaluru, KA" />
        </Field>
        <Field label="Salary from" htmlFor="smin" error={errors.salary_min}>
          <Input id="smin" inputMode="numeric" value={values.salary_min} onChange={(e) => set("salary_min", e.target.value)} placeholder="45000" />
        </Field>
        <Field label="Salary to" htmlFor="smax" error={errors.salary_max}>
          <Input id="smax" inputMode="numeric" value={values.salary_max} onChange={(e) => set("salary_max", e.target.value)} placeholder="65000" />
        </Field>
      </div>

      <Field label="Job description" htmlFor="description" error={errors.description}>
        <Textarea id="description" rows={6} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Responsibilities, class sizes, reporting line…" />
      </Field>

      <Field label="Benefits" htmlFor="benefits">
        <Textarea id="benefits" rows={3} value={values.benefits} onChange={(e) => set("benefits", e.target.value)} placeholder="Accommodation, health cover, CPD budget…" />
      </Field>

      <Field label="Required skills">
        <div className="flex gap-2">
          <Input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Type a skill and press Enter"
          />
          <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
        </div>
        {values.required_skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {values.required_skills.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button type="button" aria-label={`Remove ${s}`} onClick={() => set("required_skills", values.required_skills.filter((x) => x !== s))}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </Field>

      <Field label="Status">
        <Select value={values.status} onValueChange={(v) => set("status", v as JobFormValues["status"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">In review</SelectItem>
            {values.status === "published" && <SelectItem value="published">Live</SelectItem>}
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Roles go live once our admin team has reviewed them.
        </p>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setPreview(true)}>
          <Eye /> Preview
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => attempt("draft")}>
          Save draft
        </Button>
        <Button
          type="button"
          variant="gold"
          disabled={pending}
          onClick={() => attempt(values.status === "draft" ? "pending_review" : values.status)}
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
