import { useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ATS_STAGES, type AtsStageId } from "@/lib/ats";
import { relativeTime } from "@/lib/pipeline";
import { initialsOf } from "@/lib/crm";
import { groupByStage, type AdminApplicationRow } from "@/lib/admin-applications";
import { recruiterName, type Recruiter } from "@/lib/recruiters";
import { cn } from "@/lib/utils";

export function ApplicationsKanban({
  rows,
  recruiters,
  onMove,
  onOpen,
  selectedIds,
  onSelectionChange,
}: {
  rows: AdminApplicationRow[];
  recruiters: Recruiter[];
  onMove: (row: AdminApplicationRow, to: AtsStageId) => void;
  onOpen: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<AtsStageId | null>(null);
  const [collapsed, setCollapsed] = useState<Set<AtsStageId>>(new Set());
  const columns = useMemo(() => groupByStage(rows), [rows]);

  const drop = (stage: AtsStageId) => {
    const row = rows.find((r) => r.id === dragId);
    setDragId(null);
    setOverStage(null);
    if (row) onMove(row, stage);
  };

  const toggleCollapse = (id: AtsStageId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelect = (id: string) =>
    onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <div className="-mx-1 overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4 px-1">
        {ATS_STAGES.map((stage) => {
          const cards = columns.get(stage.id) ?? [];
          const isCollapsed = collapsed.has(stage.id);
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.id);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={() => drop(stage.id)}
              className={cn(
                "flex flex-col rounded-2xl border border-border bg-secondary/50 p-3 transition-colors",
                isCollapsed ? "w-16" : "w-72",
                overStage === stage.id && "border-gold bg-gold/10",
              )}
            >
              <header
                className="flex cursor-pointer items-center justify-between gap-2 px-1 pb-3"
                onClick={() => toggleCollapse(stage.id)}
              >
                {isCollapsed ? (
                  <Badge variant="secondary">{cards.length}</Badge>
                ) : (
                  <>
                    <h2 className="font-serif text-sm tracking-wide">{stage.label}</h2>
                    <Badge variant="secondary">{cards.length}</Badge>
                  </>
                )}
              </header>
              {!isCollapsed && (
                <div className="flex flex-1 flex-col gap-2">
                  {cards.map((card) => (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onOpen(card.id)}
                      className={cn(
                        "cursor-pointer rounded-xl border border-border bg-card p-3 shadow-soft transition-shadow hover:shadow-md",
                        dragId === card.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <Checkbox
                            checked={selectedIds.includes(card.id)}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => toggleSelect(card.id)}
                            className="mt-0.5"
                          />
                          <p className="min-w-0 truncate text-sm font-medium">{card.teacher_name}</p>
                        </div>
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{card.job_title}</p>
                      <p className="truncate text-xs text-muted-foreground">{card.school_name}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-medium text-primary">
                          {initialsOf(recruiterName(recruiters, card.assigned_recruiter), "?")}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{relativeTime(card.updated_at)}</span>
                      </div>
                    </article>
                  ))}
                  {cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      No candidates
                    </p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
