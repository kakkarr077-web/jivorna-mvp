import { Badge } from "@/components/ui/badge";
import { statusLabel, type InvoiceStatus } from "@/lib/invoices";

const tone: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-800",
  Pending: "bg-amber-100 text-amber-900",
  Overdue: "bg-red-100 text-red-800",
  Void: "bg-muted text-muted-foreground",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const label = statusLabel(status);
  return <Badge className={`border-0 ${tone[label] ?? ""}`}>{label}</Badge>;
}
