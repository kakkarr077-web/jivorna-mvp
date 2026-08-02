import { cn } from "@/lib/utils";

export function ChipGroup({
  options,
  value,
  onChange,
  allowCustom,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
}) {
  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  const custom = value.filter((v) => !options.includes(v));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[...options, ...custom].map((option) => {
          const active = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-gold hover:text-foreground",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {allowCustom && (
        <input
          placeholder="Add your own, then press Enter"
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const raw = e.currentTarget.value.trim();
            if (raw && !value.includes(raw)) onChange([...value, raw]);
            e.currentTarget.value = "";
          }}
        />
      )}
    </div>
  );
}
