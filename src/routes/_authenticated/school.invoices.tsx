import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, IndianRupee, Receipt, Search } from "lucide-react";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { InvoiceStatusBadge } from "./admin.invoices";
import {
  downloadInvoicePdf,
  effectiveStatus,
  formatMoney,
  statusLabel,
  type InvoiceRow,
} from "@/lib/invoices";

export const Route = createFileRoute("/_authenticated/school/invoices")({
  component: SchoolInvoices,
  head: () => ({
    meta: [
      { title: "Billing & invoices | Jivorna school portal" },
      { name: "description", content: "View your Jivorna invoices, payment status and download PDF receipts." },
    ],
  }),
});

function SchoolInvoices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["school-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, schools(name,city,contact_email)")
        .order("issued_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((inv) => {
      if (status !== "all" && statusLabel(effectiveStatus(inv)).toLowerCase() !== status) return false;
      if (!term) return true;
      return `${inv.invoice_number} ${inv.description ?? ""}`.toLowerCase().includes(term);
    });
  }, [data, q, status]);

  const totals = useMemo(() => {
    const all = data ?? [];
    const sum = (l: InvoiceRow[]) => l.reduce((a, i) => a + Number(i.amount), 0);
    return {
      paid: sum(all.filter((i) => effectiveStatus(i) === "paid")),
      due: sum(all.filter((i) => ["sent", "draft", "overdue"].includes(effectiveStatus(i)))),
      overdue: all.filter((i) => effectiveStatus(i) === "overdue").length,
      currency: all[0]?.currency ?? "INR",
    };
  }, [data]);

  return (
    <div>
      <PageHeader title="Billing & invoices" description="Your Jivorna invoices and payment history." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total paid" value={formatMoney(totals.paid, totals.currency)} icon={IndianRupee} />
        <StatCard label="Outstanding" value={formatMoney(totals.due, totals.currency)} icon={Receipt} />
        <StatCard label="Overdue invoices" value={totals.overdue} icon={Receipt} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search invoices" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : rows.length === 0 ? (
          <EmptyState title="No invoices yet" description="Invoices appear here once Jivorna bills your school." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{inv.description ?? "—"}</TableCell>
                    <TableCell>{new Date(inv.issued_on).toLocaleDateString()}</TableCell>
                    <TableCell>{inv.due_on ? new Date(inv.due_on).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(inv.amount), inv.currency)}</TableCell>
                    <TableCell><InvoiceStatusBadge status={effectiveStatus(inv)} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" aria-label="Download PDF" onClick={() => downloadInvoicePdf(inv)}>
                        <Download className="h-4 w-4" />
                      </Button>
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
