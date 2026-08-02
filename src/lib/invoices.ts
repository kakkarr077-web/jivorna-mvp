import { jsPDF } from "jspdf";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export type InvoiceRow = {
  id: string;
  school_id: string;
  invoice_number: string;
  description: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issued_on: string;
  due_on: string | null;
  paid_on: string | null;
  created_at: string;
  schools?: { name: string | null; city: string | null; contact_email: string | null } | null;
};

/** Display status: anything unpaid past its due date reads as overdue. */
export function effectiveStatus(inv: Pick<InvoiceRow, "status" | "due_on">): InvoiceStatus {
  if (inv.status === "paid" || inv.status === "void") return inv.status;
  if (inv.due_on && new Date(inv.due_on) < new Date(new Date().toDateString())) return "overdue";
  return inv.status;
}

export function statusLabel(s: InvoiceStatus) {
  if (s === "sent" || s === "draft") return "Pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function nextInvoiceNumber(existing: string[]) {
  const year = new Date().getFullYear();
  const prefix = `JIV-${year}-`;
  const max = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number.parseInt(n.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

const NAVY: [number, number, number] = [10, 46, 99];
const GOLD: [number, number, number] = [176, 138, 60];
const SLATE: [number, number, number] = [30, 41, 59];

export function downloadInvoicePdf(inv: InvoiceRow) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const status = effectiveStatus(inv);

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.text("Jivorna", 48, 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text("Teacher recruitment platform", 48, 76);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", w - 48, 58, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(inv.invoice_number, w - 48, 76, { align: "right" });

  doc.setTextColor(...SLATE);
  let y = 160;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text("BILLED TO", 48, y);
  doc.text("DETAILS", w / 2 + 20, y);
  doc.setTextColor(...SLATE);
  doc.setFontSize(12);
  y += 20;
  doc.text(inv.schools?.name ?? "School", 48, y);
  doc.setFontSize(10);
  const meta: string[] = [];
  if (inv.schools?.city) meta.push(inv.schools.city);
  if (inv.schools?.contact_email) meta.push(inv.schools.contact_email);
  meta.forEach((line, i) => doc.text(line, 48, y + 16 + i * 14));

  const details: [string, string][] = [
    ["Issued", new Date(inv.issued_on).toLocaleDateString()],
    ["Due", inv.due_on ? new Date(inv.due_on).toLocaleDateString() : "—"],
    ["Status", statusLabel(status)],
    ["Paid on", inv.paid_on ? new Date(inv.paid_on).toLocaleDateString() : "—"],
  ];
  details.forEach(([k, v], i) => {
    doc.setTextColor(120, 120, 130);
    doc.text(k, w / 2 + 20, y + i * 16);
    doc.setTextColor(...SLATE);
    doc.text(v, w - 48, y + i * 16, { align: "right" });
  });

  y += 110;
  doc.setDrawColor(228, 228, 232);
  doc.line(48, y, w - 48, y);
  y += 24;
  doc.setTextColor(120, 120, 130);
  doc.setFontSize(9);
  doc.text("DESCRIPTION", 48, y);
  doc.text("AMOUNT", w - 48, y, { align: "right" });
  y += 20;
  doc.setTextColor(...SLATE);
  doc.setFontSize(11);
  const desc = doc.splitTextToSize(inv.description || "Recruitment services", w / 2);
  doc.text(desc, 48, y);
  doc.text(formatMoney(Number(inv.amount), inv.currency), w - 48, y, { align: "right" });

  y += Math.max(desc.length * 14, 24) + 16;
  doc.line(48, y, w - 48, y);
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total due", 48, y);
  doc.setTextColor(...NAVY);
  doc.setFontSize(16);
  doc.text(formatMoney(Number(inv.amount), inv.currency), w - 48, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 150);
  doc.text(
    "Thank you for partnering with Jivorna. Please reference the invoice number with your payment.",
    48,
    doc.internal.pageSize.getHeight() - 56,
  );

  doc.save(`${inv.invoice_number}.pdf`);
}
