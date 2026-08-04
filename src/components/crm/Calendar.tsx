import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { monthGridDays, sameDay, weekDays, type AgendaEntry } from "@/lib/calendar-events";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarView = "month" | "week" | "agenda";

const KIND_CHIP: Record<AgendaEntry["kind"], string> = {
  interview: "bg-primary/10 text-primary",
  event: "bg-gold/15 text-gold",
  task: "bg-secondary text-foreground",
};

function entryTime(entry: AgendaEntry) {
  return new Date(entry.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function EntryChip({ entry, onClick }: { entry: AgendaEntry; onClick?: (() => void) | undefined }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80",
        KIND_CHIP[entry.kind],
      )}
      title={entry.title}
    >
      {entry.title}
    </button>
  );
}

export function Calendar({
  entries,
  onSelectEntry,
  onCreateAt,
}: {
  entries: AgendaEntry[];
  onSelectEntry?: ((entry: AgendaEntry) => void) | undefined;
  onCreateAt?: ((date: Date) => void) | undefined;
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());

  const entriesByDay = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>();
    for (const e of entries) {
      const d = new Date(e.at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return map;
  }, [entries]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const entriesFor = (d: Date) => entriesByDay.get(dayKey(d)) ?? [];

  const goPrev = () => {
    setAnchor((a) => {
      const d = new Date(a);
      if (view === "month") d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 7);
      return d;
    });
  };
  const goNext = () => {
    setAnchor((a) => {
      const d = new Date(a);
      if (view === "month") d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 7);
      return d;
    });
  };
  const goToday = () => setAnchor(new Date());

  const monthLabel = anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const upcomingAgenda = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...entries]
      .filter((e) => new Date(e.at).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [entries]);

  const agendaGroups = useMemo(() => {
    const groups: { key: string; label: string; items: AgendaEntry[] }[] = [];
    for (const entry of upcomingAgenda) {
      const d = new Date(entry.at);
      const key = dayKey(d);
      const existing = groups.find((g) => g.key === key);
      const label = d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
      if (existing) existing.items.push(entry);
      else groups.push({ key, label, items: [entry] });
    }
    return groups;
  }, [upcomingAgenda]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={goPrev} aria-label="Previous" disabled={view === "agenda"}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-40 text-center font-serif text-lg">
            {view === "agenda" ? "Upcoming" : monthLabel}
          </h2>
          <Button size="icon" variant="ghost" onClick={goNext} aria-label="Next" disabled={view === "agenda"}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToday} disabled={view === "agenda"}>
            Today
          </Button>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-secondary/40 p-1">
          {(["month", "week", "agenda"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                view === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div className={cn("sm:block", "hidden")}>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGridDays(anchor).map((day) => {
              const list = entriesFor(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const isToday = sameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onCreateAt?.(day)}
                  className={cn(
                    "min-h-24 rounded-lg border border-border p-1.5 text-left align-top transition-colors hover:border-primary/40",
                    !inMonth && "opacity-40",
                    isToday && "border-gold bg-gold/10",
                  )}
                >
                  <span className="text-xs font-medium">{day.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 3).map((entry) => (
                      <EntryChip key={entry.id} entry={entry} onClick={() => onSelectEntry?.(entry)} />
                    ))}
                    {list.length > 3 && (
                      <p className="px-1.5 text-[10px] text-muted-foreground">+{list.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "month" && (
        <div className="sm:hidden">
          <AgendaList groups={agendaGroups} onSelectEntry={onSelectEntry} />
        </div>
      )}

      {view === "week" && (
        <div className="grid gap-2 sm:grid-cols-7">
          {weekDays(anchor).map((day) => {
            const list = entriesFor(day);
            const isToday = sameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn("min-h-28 rounded-lg border border-border p-2", isToday && "border-gold bg-gold/10")}
              >
                <button
                  type="button"
                  onClick={() => onCreateAt?.(day)}
                  className="mb-2 block w-full text-left text-xs font-medium hover:text-primary"
                >
                  {day.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                </button>
                <div className="space-y-1">
                  {list.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No entries</p>
                  ) : (
                    list.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onSelectEntry?.(entry)}
                        className={cn("block w-full rounded px-1.5 py-1 text-left text-[11px]", KIND_CHIP[entry.kind])}
                      >
                        <span className="font-medium">{entryTime(entry)}</span> {entry.title}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "agenda" && <AgendaList groups={agendaGroups} onSelectEntry={onSelectEntry} />}
    </div>
  );
}

function AgendaList({
  groups,
  onSelectEntry,
}: {
  groups: { key: string; label: string; items: AgendaEntry[] }[];
  onSelectEntry?: ((entry: AgendaEntry) => void) | undefined;
}) {
  if (groups.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nothing scheduled.</p>;
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.label}</p>
          <ul className="space-y-2">
            {g.items.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelectEntry?.(entry)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className={cn("shrink-0 rounded px-2 py-1 text-[11px] font-medium", KIND_CHIP[entry.kind])}>
                    {entryTime(entry)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    {entry.subtitle && <p className="truncate text-xs text-muted-foreground">{entry.subtitle}</p>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
