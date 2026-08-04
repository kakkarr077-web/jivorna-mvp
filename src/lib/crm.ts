/** Generic CRM helpers shared by every admin module. */

export const escapeCsvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Build a CSV string from column definitions and rows. */
export function toCsv<T>(columns: { header: string; value: (row: T) => unknown }[], rows: T[]) {
  const lines = [columns.map((c) => escapeCsvCell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvCell(c.value(row))).join(","));
  }
  return lines.join("\n");
}

export function downloadCsvFile(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const formatMoney = (v: number | null | undefined) =>
  v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;

export const titleCase = (v: string) =>
  v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const initialsOf = (name: string | null | undefined, fallback = "?") => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
};

/** Case-insensitive "does any field contain the term" search. */
export const matchesTerm = (term: string, fields: (string | number | null | undefined)[]) => {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(t));
};

export const dash = (v: unknown, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : String(v);
