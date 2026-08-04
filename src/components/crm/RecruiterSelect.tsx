import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchRecruiters, UNASSIGNED } from "@/lib/recruiters";

/** Shared "assigned recruiter" picker. Emits `null` for the unassigned option. */
export function RecruiterSelect({
  value,
  onChange,
  placeholder = "Assign recruiter",
  includeUnassigned = true,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  includeUnassigned?: boolean;
  className?: string;
}) {
  const { data } = useQuery({ queryKey: ["recruiters"], queryFn: fetchRecruiters });

  return (
    <Select
      value={value ?? UNASSIGNED}
      onValueChange={(v) => onChange(v === UNASSIGNED ? null : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeUnassigned && <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>}
        {(data ?? []).map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Read-only recruiter label used inside tables. */
export function RecruiterLabel({ id }: { id: string | null | undefined }) {
  const { data } = useQuery({ queryKey: ["recruiters"], queryFn: fetchRecruiters });
  if (!id) return <span className="text-muted-foreground">Unassigned</span>;
  return <>{data?.find((r) => r.id === id)?.name ?? "Unknown"}</>;
}
