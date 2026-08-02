import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, IndianRupee, Plus, Receipt, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/Primitives";
import { InvoiceStatusBadge } from "@/components/shared/InvoiceStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  downloadInvoicePdf,
  effectiveStatus,
  formatMoney,
  nextInvoiceNumber,
  statusLabel,
  type InvoiceRow,
  type InvoiceStatus,
} from "@/lib/invoices";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  component: AdminInvoices,
  head: () => ({
    meta: [
      { title: "Invoices & revenue | Jivorna admin" },
      { name: "description", content: "Generate invoices, track payments and monitor Jivorna revenue." },
    ],
  }),
});

function AdminInvoices() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [school, setSchool] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, schools(name,city,contact_email)")
        .order("issued_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
  });

  const { data: schools } = useQuery({
    queryKey: ["admin-schools-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: InvoiceStatus }) => {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: next,
          paid_on: next === "paid" ? new Date().toISOString().slice(0, 10) : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      toast.success("Payment status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (invoices ?? []).filter((inv) => {
      if (school !== "all" && inv.school_id !== school) return false;
      if (status !== "all" && statusLabel(effectiveStatus(inv)).toLowerCase() !== status) return false;
      if (!term) return true;
      return [inv.invoice_number, inv.description ?? "", inv.schools?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [invoices, q, school, status]);

  const totals = useMemo(() => {
    const all = invoices ?? [];
    const sum = (list: InvoiceRow[]) => list.reduce((a, i) => a + Number(i.amount), 0);
    const paid = all.filter((i) => effectiveStatus(i) === "paid");
    const overdue = all.filter((i) => effectiveStatus(i) === "overdue");
    const pending = all.filter((i) => ["sent", "draft"].includes(effectiveStatus(i)));
    return {
      collected: sum(paid),
      outstanding: sum(pending) + sum(overdue),
      overdue: sum(overdue),
      count: all.length,
      currency: all[0]?.currency ?? "INR",
    };
  }, [invoices]);

  const chart = useMemo(() => {
    const map = new Map<string, { month: string; collected: number; billed: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      map.set(key, { month: d.toLocaleString(undefined, { month: "short" }), collected: 0, billed: 0 });
    }
    (invoices ?? []).forEach((inv) => {
      const key = inv.issued_on.slice(0, 7);
      const bucket = map.get(key);
      if (!bucket) return;
      bucket.billed += Number(inv.amount);
      if (effectiveStatus(inv) === "paid") bucket.collected += Number(inv.amount);
    });
    return [...map.values()];
  }, [invoices]);

  return (
    <div>
      <PageHeader
        title="Invoices & revenue"
        description="Generate invoices for schools, track payments and monitor collections."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <InvoiceForm
                schools={schools ?? []}
                existingNumbers={(invoices ?? []).map((i) => i.invoice_number)}
                onDone={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["admin-invoices"] });
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue collected" value={formatMoney(totals.collected, totals.currency)} icon={IndianRupee} />
        <StatCard label="Outstanding" value={formatMoney(totals.outstanding, totals.currency)} icon={TrendingUp} />
        <StatCard label="Overdue" value={formatMoney(totals.overdue, totals.currency)} icon={Receipt} hint="Past due date" />
        <StatCard label="Invoices issued" value={totals.count} icon={Receipt} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-serif text-xl">Billed vs collected</h2>
        <p className="text-sm text-muted-foreground">Last six months</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} />
              <RTooltip formatter={(v: number) => formatMoney(v, totals.currency)} />
              <Bar dataKey="billed" name="Billed" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search invoice number, school or description"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={school} onValueChange={setSchool}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="School" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All schools</SelectItem>
            {(schools ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : rows.length === 0 ? (
          <EmptyState title="No invoices found" description="Generate your first invoice for a school." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.schools?.name ?? "—"}</TableCell>
                    <TableCell>{new Date(inv.issued_on).toLocaleDateString()}</TableCell>
                    <TableCell>{inv.due_on ? new Date(inv.due_on).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(inv.amount), inv.currency)}</TableCell>
                    <TableCell><InvoiceStatusBadge status={effectiveStatus(inv)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={inv.status}
                          onValueChange={(v) => setStatusMutation.mutate({ id: inv.id, next: v as InvoiceStatus })}
                        >
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sent">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" aria-label="Download PDF" onClick={() => downloadInvoicePdf(inv)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceForm({
  schools,
  existingNumbers,
  onDone,
}: {
  schools: { id: string; name: string }[];
  existingNumbers: string[];
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    school_id: "",
    invoice_number: nextInvoiceNumber(existingNumbers),
    description: "",
    amount: "",
    currency: "INR",
    status: "sent" as InvoiceStatus,
    issued_on: today,
    due_on: due,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.school_id) throw new Error("Select a school");
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("invoices").insert({
        school_id: form.school_id,
        invoice_number: form.invoice_number.trim(),
        description: form.description.trim() || null,
        amount,
        currency: form.currency,
        status: form.status,
        issued_on: form.issued_on,
        due_on: form.due_on || null,
        paid_on: form.status === "paid" ? today : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice generated");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">Generate invoice</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label>School</Label>
          <Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
            <SelectContent>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="num">Invoice number</Label>
            <Input id="num" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amt">Amount</Label>
            <Input id="amt" inputMode="decimal" placeholder="25000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="issued">Issued on</Label>
            <Input id="issued" type="date" value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueon">Due on</Label>
            <Input id="dueon" type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as InvoiceStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={3} placeholder="Placement fee — 2 teachers hired" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Generate invoice"}
        </Button>
      </DialogFooter>
    </>
  );
}
