import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SchoolRow } from "@/lib/admin-schools";

const BOARDS = ["CBSE", "ICSE", "IB", "Cambridge", "State"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Visiting"];

/** Admin edit of the core school record. RLS already allows admins to manage schools. */
export function SchoolEditDialog({ school, trigger }: { school: SchoolRow; trigger: ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: school.name,
    board: school.board ?? "",
    school_type: school.school_type ?? "",
    city: school.city ?? "",
    website: school.website ?? "",
    phone: school.phone ?? "",
    contact_email: school.contact_email ?? "",
    principal_name: school.principal_name ?? "",
    hr_name: school.hr_name ?? "",
    student_count: school.student_count?.toString() ?? "",
    description: school.description ?? "",
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("schools")
        .update({
          name: form.name.trim(),
          board: form.board.trim() || null,
          school_type: form.school_type.trim() || null,
          city: form.city.trim() || null,
          website: form.website.trim() || null,
          phone: form.phone.trim() || null,
          contact_email: form.contact_email.trim() || null,
          principal_name: form.principal_name.trim() || null,
          hr_name: form.hr_name.trim() || null,
          student_count: form.student_count ? Number(form.student_count) : null,
          description: form.description.trim() || null,
        })
        .eq("id", school.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("School updated.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin-school", school.id] });
      void qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save school"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit school</DialogTitle>
          <DialogDescription>Changes are visible to the school on their own profile page.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="School name">
            <Input value={form.name} onChange={(e) => set("name")(e.target.value)} />
          </Field>
          <Field label="Board">
            <Select value={form.board} onValueChange={set("board")}>
              <SelectTrigger>
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {BOARDS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="School type">
            <Input value={form.school_type} onChange={(e) => set("school_type")(e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => set("city")(e.target.value)} />
          </Field>
          <Field label="Principal">
            <Input value={form.principal_name} onChange={(e) => set("principal_name")(e.target.value)} />
          </Field>
          <Field label="HR manager">
            <Input value={form.hr_name} onChange={(e) => set("hr_name")(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.contact_email} onChange={(e) => set("contact_email")(e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => set("website")(e.target.value)} />
          </Field>
          <Field label="Number of students">
            <Input
              type="number"
              value={form.student_count}
              onChange={(e) => set("student_count")(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="gold" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Admin-side quick vacancy creation on behalf of a school. */
export function SchoolCreateJobDialog({ schoolId, trigger }: { schoolId: string; trigger: ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    grade: "",
    employment_type: "Full-time",
    location: "",
    salary_range: "",
    description: "",
    status: "draft" as "draft" | "published",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").insert({
        school_id: schoolId,
        title: form.title.trim(),
        subject: form.subject.trim() || null,
        grade: form.grade.trim() || null,
        employment_type: form.employment_type,
        location: form.location.trim() || null,
        salary_range: form.salary_range.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vacancy created.");
      setOpen(false);
      setForm((f) => ({ ...f, title: "", subject: "", grade: "", location: "", salary_range: "", description: "" }));
      void qc.invalidateQueries({ queryKey: ["admin-school", schoolId] });
      void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create vacancy"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Create vacancy</DialogTitle>
          <DialogDescription>Posted on behalf of this school.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Subject / department">
            <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </Field>
          <Field label="Grade">
            <Input value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} />
          </Field>
          <Field label="Employment type">
            <Select
              value={form.employment_type}
              onValueChange={(v) => setForm((f) => ({ ...f, employment_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </Field>
          <Field label="Salary range">
            <Input
              value={form.salary_range}
              onChange={(e) => setForm((f) => ({ ...f, salary_range: e.target.value }))}
            />
          </Field>
          <Field label="Publish status">
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as "draft" | "published" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Save as draft</SelectItem>
                <SelectItem value="published">Publish immediately</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="gold" disabled={!form.title.trim() || create.isPending} onClick={() => create.mutate()}>
            Create vacancy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
