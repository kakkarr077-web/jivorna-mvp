import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/school/jobs")({
  component: SchoolJobs,
});

type JobRow = {
  id: string;
  title: string;
  subject: string | null;
  location: string | null;
  employment_type: string;
  salary_range: string | null;
  status: "draft" | "published" | "closed";
};

function SchoolJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    subject: "",
    location: "",
    employment_type: "Full-time",
    salary_range: "",
    description: "",
  });

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
        .select("id,title,subject,location,employment_type,salary_range,status")
        .eq("school_id", school!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").insert({ ...form, school_id: school!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vacancy published.");
      setForm({ title: "", subject: "", location: "", employment_type: "Full-time", salary_range: "", description: "" });
      void qc.invalidateQueries({ queryKey: ["school-jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not publish"),
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

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_380px]">
      <div>
        <PageHeader title="Vacancies" description="Everything you've posted, live or closed." />
        {(jobs ?? []).length === 0 ? (
          <EmptyState title="No vacancies yet" description="Use the form to publish your first role." />
        ) : (
          <ul className="grid gap-4">
            {(jobs ?? []).map((j) => (
              <li key={j.id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg">{j.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[j.subject, j.location, j.employment_type, j.salary_range].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {j.status}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  {j.status !== "published" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: j.id, status: "published" })}>
                      Publish
                    </Button>
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

      <form
        className="h-fit rounded-xl border border-border bg-card p-6 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-serif text-xl">Post a vacancy</h2>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Role title</Label>
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Teacher of Physics" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Physics" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Leeds" />
          </div>
          <div className="grid gap-2">
            <Label>Employment type</Label>
            <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Full-time", "Part-time", "Fixed-term", "Supply"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="salary">Salary range</Label>
            <Input id="salary" value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="£32,000 – £42,000" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button type="submit" disabled={create.isPending || !school}>
            {create.isPending ? "Publishing…" : "Publish vacancy"}
          </Button>
        </div>
      </form>
    </div>
  );
}
