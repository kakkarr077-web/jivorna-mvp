import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/Primitives";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { DocumentUpload, type DocumentRow } from "@/components/teacher/DocumentUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  completionPercent,
  emptyWizard,
  GRADE_OPTIONS,
  LANGUAGE_OPTIONS,
  STEPS,
  SUBJECT_OPTIONS,
  validateStep,
  wizardSchema,
  type WizardValues,
} from "@/lib/teacherWizard";

export const Route = createFileRoute("/_authenticated/teacher/onboarding")({
  component: OnboardingWizard,
});

const STEP_KEY = "jivorna.teacher.wizard.step";

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardValues>(emptyWizard);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);

  const { data, refetch } = useQuery({
    queryKey: ["teacher-wizard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: teacher }, { data: docs }] = await Promise.all([
        supabase.from("teacher_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase
          .from("documents")
          .select("id,name,file_url,doc_type,file_size_bytes")
          .eq("owner_id", user!.id)
          .order("created_at", { ascending: false }),
      ]);
      return { teacher, docs: (docs ?? []) as DocumentRow[] };
    },
  });

  const resumeDocs = useMemo(() => (data?.docs ?? []).filter((d) => d.doc_type === "resume"), [data]);
  const certificateDocs = useMemo(
    () => (data?.docs ?? []).filter((d) => d.doc_type === "certificate"),
    [data],
  );

  // Hydrate saved progress
  useEffect(() => {
    if (!data || loaded) return;
    const t = data.teacher;
    setValues({
      ...emptyWizard,
      full_name: t?.full_name ?? "",
      email: t?.email ?? user?.email ?? "",
      phone: t?.phone ?? "",
      city: t?.city ?? "",
      state: t?.state ?? "",
      current_school: t?.current_school ?? "",
      qualification: t?.qualification ?? "",
      languages: t?.languages ?? [],
      experience_years: t?.experience_years ?? 0,
      notice_period_days: t?.notice_period_days ?? 30,
      headline: t?.headline ?? "",
      bio: t?.bio ?? "",
      subjects: t?.subjects ?? [],
      grades: t?.grades ?? [],
      current_salary: t?.current_salary ?? undefined,
      expected_salary: (t?.expected_salary ?? undefined) as number,
      available_from: t?.available_from ?? "",
      available: t?.available ?? true,
      resume_url: t?.resume_url ?? "",
      certificate_count: 0,
    });
    const stored = Number(window.localStorage.getItem(STEP_KEY));
    if (Number.isInteger(stored) && stored > 0 && stored < STEPS.length) setStep(stored);
    setLoaded(true);
  }, [data, loaded, user]);

  // Keep derived document fields in sync
  useEffect(() => {
    if (!loaded) return;
    setValues((v) => ({
      ...v,
      resume_url: resumeDocs[0]?.file_url ?? v.resume_url,
      certificate_count: certificateDocs.length,
    }));
  }, [loaded, resumeDocs, certificateDocs]);

  const set = <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => {
    dirty.current = true;
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key as string]: "" }));
  };

  const persist = useCallback(
    async (next: WizardValues) => {
      if (!user) return;
      setSaving(true);
      const { error } = await supabase.from("teacher_profiles").upsert({
        user_id: user.id,
        full_name: next.full_name || null,
        email: next.email || null,
        phone: next.phone || null,
        city: next.city || null,
        state: next.state || null,
        location: [next.city, next.state].filter(Boolean).join(", ") || null,
        current_school: next.current_school || null,
        qualification: next.qualification || null,
        languages: next.languages,
        experience_years: Number(next.experience_years) || 0,
        notice_period_days: next.notice_period_days ?? null,
        headline: next.headline || null,
        bio: next.bio || null,
        subjects: next.subjects,
        grades: next.grades,
        current_salary: next.current_salary ?? null,
        expected_salary: next.expected_salary ?? null,
        available_from: next.available_from || null,
        available: next.available,
        resume_url: next.resume_url || null,
      });
      setSaving(false);
      if (error) {
        toast.error("Autosave failed — check your connection.");
        return;
      }
      setSavedAt(new Date());
    },
    [user],
  );

  // Autosave (debounced)
  useEffect(() => {
    if (!loaded || !dirty.current) return;
    const id = window.setTimeout(() => {
      void persist(values);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [values, loaded, persist]);

  useEffect(() => {
    window.localStorage.setItem(STEP_KEY, String(step));
  }, [step]);

  const percent = completionPercent(values);
  const current = STEPS[step]!;

  const goNext = async () => {
    const stepErrors = validateStep(step, values);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    await persist(values);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const result = wizardSchema.safeParse(values);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const field = String(firstIssue?.path[0] ?? "");
      const badStep = STEPS.findIndex((s) => (s.fields as readonly string[]).includes(field));
      if (badStep >= 0) setStep(badStep);
      setErrors({ [field]: firstIssue?.message ?? "Invalid value" });
      toast.error("Some details are still missing.");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    await persist(values);
    const { error } = await supabase
      .from("teacher_profiles")
      .update({ status: "active" })
      .eq("user_id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.localStorage.removeItem(STEP_KEY);
    toast.success("Registration submitted — your profile is live.");
    void navigate({ to: "/teacher" });
  };

  if (!loaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Complete your registration"
        description="Eight short steps. Your progress saves automatically as you type."
      />

      {/* Progress */}
      <div className="card-premium mb-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">
            Step {step + 1} of {STEPS.length} · {current.title}
          </p>
          <p className="font-serif text-2xl text-primary">{percent}%</p>
        </div>
        <Progress value={percent} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {saving ? "Saving…" : savedAt ? `Saved at ${savedAt.toLocaleTimeString()}` : "Autosave on"}
        </p>

        <ol className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
                  i === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < step
                      ? "border-gold/40 bg-gold-soft text-accent-foreground"
                      : "border-border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                {s.title}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Step body */}
      <div className="card-premium p-5 sm:p-8">
        <h2 className="font-serif text-2xl">{current.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{current.blurb}</p>
        <div className="mt-7 space-y-6">
          {current.key === "personal" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" htmlFor="full_name" error={errors["full_name"]}>
                <Input id="full_name" value={values.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors["email"]}>
                <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors["phone"]}>
                <Input id="phone" inputMode="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Current school" htmlFor="current_school" error={errors["current_school"]} hint="Optional">
                <Input id="current_school" value={values.current_school ?? ""} onChange={(e) => set("current_school", e.target.value)} />
              </Field>
              <Field label="City" htmlFor="city" error={errors["city"]}>
                <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="State" htmlFor="state" error={errors["state"]}>
                <Input id="state" value={values.state} onChange={(e) => set("state", e.target.value)} />
              </Field>
            </div>
          )}

          {current.key === "education" && (
            <>
              <Field
                label="Highest qualification"
                htmlFor="qualification"
                error={errors["qualification"]}
                hint="For example: M.Sc. Physics, B.Ed."
              >
                <Input id="qualification" value={values.qualification} onChange={(e) => set("qualification", e.target.value)} />
              </Field>
              <Field label="Languages you teach in" error={errors["languages"]}>
                <ChipGroup options={LANGUAGE_OPTIONS} value={values.languages} onChange={(v) => set("languages", v)} allowCustom />
              </Field>
            </>
          )}

          {current.key === "experience" && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Years of experience" htmlFor="experience_years" error={errors["experience_years"]}>
                  <Input
                    id="experience_years"
                    type="number"
                    min={0}
                    value={String(values.experience_years ?? 0)}
                    onChange={(e) => set("experience_years", Number(e.target.value))}
                  />
                </Field>
                <Field label="Notice period (days)" htmlFor="notice_period_days" error={errors["notice_period_days"]}>
                  <Input
                    id="notice_period_days"
                    type="number"
                    min={0}
                    value={String(values.notice_period_days ?? 0)}
                    onChange={(e) => set("notice_period_days", Number(e.target.value))}
                  />
                </Field>
              </div>
              <Field label="Professional headline" htmlFor="headline" error={errors["headline"]} hint="Shown at the top of your profile">
                <Input id="headline" value={values.headline} onChange={(e) => set("headline", e.target.value)} />
              </Field>
              <Field label="About you" htmlFor="bio" error={errors["bio"]} hint="Optional — a short paragraph on your teaching approach">
                <Textarea id="bio" rows={5} value={values.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
              </Field>
            </>
          )}

          {current.key === "subjects" && (
            <>
              <Field label="Subjects you teach" error={errors["subjects"]}>
                <ChipGroup options={SUBJECT_OPTIONS} value={values.subjects} onChange={(v) => set("subjects", v)} allowCustom />
              </Field>
              <Field label="Grade bands" error={errors["grades"]}>
                <ChipGroup options={GRADE_OPTIONS} value={values.grades} onChange={(v) => set("grades", v)} />
              </Field>
            </>
          )}

          {current.key === "salary" && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Current annual salary (₹)" htmlFor="current_salary" error={errors["current_salary"]} hint="Optional">
                  <Input
                    id="current_salary"
                    type="number"
                    min={0}
                    value={values.current_salary === undefined ? "" : String(values.current_salary)}
                    onChange={(e) => set("current_salary", e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </Field>
                <Field label="Expected annual salary (₹)" htmlFor="expected_salary" error={errors["expected_salary"]}>
                  <Input
                    id="expected_salary"
                    type="number"
                    min={0}
                    value={values.expected_salary === undefined ? "" : String(values.expected_salary)}
                    onChange={(e) => set("expected_salary", e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value))}
                  />
                </Field>
              </div>
              <Field label="Available from" htmlFor="available_from" error={errors["available_from"]}>
                <Input id="available_from" type="date" value={values.available_from ?? ""} onChange={(e) => set("available_from", e.target.value)} />
              </Field>
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-medium">Open to new roles</p>
                  <p className="text-xs text-muted-foreground">Schools can see and contact you.</p>
                </div>
                <Switch checked={values.available} onCheckedChange={(v) => set("available", v)} />
              </div>
            </>
          )}

          {current.key === "resume" && user && (
            <>
              <DocumentUpload
                userId={user.id}
                docType="resume"
                label="Upload your resume"
                documents={resumeDocs}
                onChange={() => void refetch()}
              />
              {errors["resume_url"] && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <CircleAlert className="h-3.5 w-3.5" /> {errors["resume_url"]}
                </p>
              )}
            </>
          )}

          {current.key === "certificates" && user && (
            <DocumentUpload
              userId={user.id}
              docType="certificate"
              multiple
              label="Upload certificates"
              documents={certificateDocs}
              onChange={() => void refetch()}
            />
          )}

          {current.key === "review" && (
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ["Full name", values.full_name],
                ["Email", values.email],
                ["Phone", values.phone],
                ["Location", [values.city, values.state].filter(Boolean).join(", ")],
                ["Current school", values.current_school || "—"],
                ["Qualification", values.qualification],
                ["Languages", values.languages.join(", ")],
                ["Experience", `${values.experience_years} years`],
                ["Notice period", `${values.notice_period_days ?? 0} days`],
                ["Headline", values.headline],
                ["Subjects", values.subjects.join(", ")],
                ["Grades", values.grades.join(", ")],
                ["Current salary", values.current_salary ? `₹${values.current_salary}` : "—"],
                ["Expected salary", values.expected_salary ? `₹${values.expected_salary}` : "—"],
                ["Available from", values.available_from || "Immediately"],
                ["Resume", resumeDocs[0]?.name ?? "Not uploaded"],
                ["Certificates", certificateDocs.length ? `${certificateDocs.length} uploaded` : "None"],
              ].map(([label, value]) => (
                <div key={label as string} className="border-b border-border pb-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Nav */}
        <div className="mt-9 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0} className="w-full sm:w-auto">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => void goNext()} className="w-full sm:w-auto">
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" variant="gold" onClick={() => void submit()} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Submit registration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
