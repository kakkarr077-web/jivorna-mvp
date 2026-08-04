import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
import { ConfirmDialog } from "@/components/crm/CrmPrimitives";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  convertLeadToSchool,
  createLead,
  deleteLead,
  updateLead,
  type LeadRow,
} from "@/lib/admin-leads";

const leadSchema = z.object({
  school_name: z.string().min(2, "School name is required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  city: z.string().optional(),
  board: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]),
  priority: z.enum(LEAD_PRIORITIES as [string, ...string[]]),
  next_follow_up: z.string().optional(),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

function useRecruiters() {
  return useQuery({
    queryKey: ["admin-recruiters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,full_name,email");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
    },
  });
}

function LeadFormFields({ form, recruiters }: { form: ReturnType<typeof useForm<LeadFormValues>>; recruiters: { id: string; full_name: string | null; email: string | null }[] }) {
  const { register, watch, setValue, formState } = form;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="School name" error={formState.errors.school_name?.message}>
        <Input {...register("school_name")} />
      </Field>
      <Field label="Contact person">
        <Input {...register("contact_person")} />
      </Field>
      <Field label="Phone">
        <Input {...register("phone")} />
      </Field>
      <Field label="Email" error={formState.errors.email?.message}>
        <Input {...register("email")} />
      </Field>
      <Field label="City">
        <Input {...register("city")} />
      </Field>
      <Field label="Board">
        <Input {...register("board")} />
      </Field>
      <Field label="Source">
        <Input {...register("source")} placeholder="Referral, website, event…" />
      </Field>
      <Field label="Next follow-up">
        <Input type="date" {...register("next_follow_up")} />
      </Field>
      <Field label="Status">
        <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Priority">
        <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {LEAD_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Assigned recruiter">
        <Select value={watch("assigned_to") || "none"} onValueChange={(v) => setValue("assigned_to", v === "none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {recruiters.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.full_name || r.email || "Team member"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea rows={3} {...register("notes")} />
      </Field>
    </div>
  );
}

export function NewLeadDialog({ trigger }: { trigger: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: recruiters = [] } = useRecruiters();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      school_name: "",
      contact_person: "",
      phone: "",
      email: "",
      city: "",
      board: "",
      source: "",
      status: "new",
      priority: "medium",
      next_follow_up: "",
      assigned_to: "",
      notes: "",
    },
  });

  const create = useMutation({
    mutationFn: async (values: LeadFormValues) =>
      createLead({
        school_name: values.school_name.trim(),
        contact_person: values.contact_person?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        city: values.city?.trim() || null,
        board: values.board?.trim() || null,
        source: values.source?.trim() || null,
        status: values.status as LeadFormValues["status"] as never,
        priority: values.priority as never,
        next_follow_up: values.next_follow_up || null,
        assigned_to: values.assigned_to || null,
        notes: values.notes?.trim() || null,
      }),
    onSuccess: (id) => {
      toast.success("Lead created.");
      setOpen(false);
      form.reset();
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
      void navigate({ to: "/admin/leads/$leadId", params: { leadId: id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create lead"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New lead</DialogTitle>
          <DialogDescription>Add a prospective school to the pipeline.</DialogDescription>
        </DialogHeader>
        <LeadFormFields form={form} recruiters={recruiters} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit((v) => create.mutate(v))} disabled={create.isPending}>
            Create lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditLeadDialog({ lead, trigger }: { lead: LeadRow; trigger: ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: recruiters = [] } = useRecruiters();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      school_name: lead.school_name,
      contact_person: lead.contact_person ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      city: lead.city ?? "",
      board: lead.board ?? "",
      source: lead.source ?? "",
      status: lead.status,
      priority: lead.priority,
      next_follow_up: lead.next_follow_up ?? "",
      assigned_to: lead.assigned_to ?? "",
      notes: lead.notes ?? "",
    },
  });

  const save = useMutation({
    mutationFn: async (values: LeadFormValues) =>
      updateLead(lead.id, {
        school_name: values.school_name.trim(),
        contact_person: values.contact_person?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        city: values.city?.trim() || null,
        board: values.board?.trim() || null,
        source: values.source?.trim() || null,
        status: values.status as never,
        priority: values.priority as never,
        next_follow_up: values.next_follow_up || null,
        assigned_to: values.assigned_to || null,
        notes: values.notes?.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Lead updated.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
      void qc.invalidateQueries({ queryKey: ["admin-lead", lead.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update lead"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit lead</DialogTitle>
        </DialogHeader>
        <LeadFormFields form={form} recruiters={recruiters} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit((v) => save.mutate(v))} disabled={save.isPending}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteLeadDialog({ leadId, trigger, onDeleted }: { leadId: string; trigger: ReactNode; onDeleted?: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteLead(leadId),
    onSuccess: () => {
      toast.success("Lead deleted.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
      onDeleted?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete lead"),
  });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this lead?"
        description="This will permanently remove the lead and its activity history."
        confirmLabel="Delete"
        destructive
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}

export function ConvertLeadDialog({ lead, trigger, onConverted }: { lead: LeadRow; trigger: ReactNode; onConverted?: (schoolId: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const convert = useMutation({
    mutationFn: () => convertLeadToSchool(lead),
    onSuccess: (schoolId) => {
      toast.success("Lead converted to a school account.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
      void qc.invalidateQueries({ queryKey: ["admin-lead", lead.id] });
      void qc.invalidateQueries({ queryKey: ["admin-schools"] });
      onConverted?.(schoolId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not convert lead"),
  });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Convert lead to a school?"
        description="This creates a new school account from this lead's details and marks the lead as won."
        confirmLabel="Convert"
        onConfirm={() => convert.mutate()}
      />
    </>
  );
}

function Field({ label, children, error, className }: { label: string; children: ReactNode; error?: string | undefined; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
