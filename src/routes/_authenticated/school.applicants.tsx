import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PIPELINE_STAGES, normalizeStage, relativeTime, type StageId } from "@/lib/pipeline";
import { ApplicationDetail, type PipelineCard } from "@/components/school/ApplicationDetail";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/school/applicants")({
  component: SchoolApplicants,
});

function SchoolApplicants() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);
  const [active, setActive] = useState<PipelineCard | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["school-applicants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: school } = await supabase.from("schools").select("id").eq("owner_id", user!.id).maybeSingle();
      if (!school) return [] as PipelineCard[];
      const { data: jobs } = await supabase.from("jobs").select("id,title").eq("school_id", school.id);
      const titles = new Map((jobs ?? []).map((j) => [j.id, j.title]));
      const ids = [...titles.keys()];
      if (!ids.length) return [] as PipelineCard[];
      const { data: apps, error } = await supabase
        .from("applications")
        .select("id,status,created_at,cover_letter,teacher_id,job_id")
        .in("job_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const teacherIds = [...new Set((apps ?? []).map((a) => a.teacher_id))];
      const { data: profiles } = await supabase
        .from("teacher_profiles")
        .select("user_id,full_name")
        .in("user_id", teacherIds);
      const names = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
      return (apps ?? []).map((a) => ({
        id: a.id,
        status: a.status as string,
        created_at: a.created_at,
        cover_letter: a.cover_letter,
        teacher_id: a.teacher_id,
        teacher_name: names.get(a.teacher_id) ?? "Candidate",
        job_title: titles.get(a.job_id) ?? "Vacancy",
      })) as PipelineCard[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ card, to }: { card: PipelineCard; to: StageId }) => {
      const from = normalizeStage(card.status);
      if (from === to) return;
      const { error } = await supabase.from("applications").update({ status: to }).eq("id", card.id);
      if (error) throw error;
      await supabase.from("application_events").insert({
        application_id: card.id,
        actor_id: user!.id,
        event_type: "stage_change",
        from_status: from,
        to_status: to,
        summary: `Moved to ${PIPELINE_STAGES.find((s) => s.id === to)?.label}`,
      });
    },
    onSuccess: () => {
      toast.success("Candidate moved.");
      void qc.invalidateQueries({ queryKey: ["school-applicants"] });
      void qc.invalidateQueries({ queryKey: ["application-events"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not move candidate"),
  });

  const columns = useMemo(() => {
    const map = new Map<StageId, PipelineCard[]>(PIPELINE_STAGES.map((s) => [s.id, []]));
    for (const card of data ?? []) {
      const stage = normalizeStage(card.status);
      map.get(stage)?.push(card);
    }
    return map;
  }, [data]);

  const drop = (stage: StageId) => {
    const card = (data ?? []).find((c) => c.id === dragId);
    setDragId(null);
    setOverStage(null);
    if (card) move.mutate({ card, to: stage });
  };

  return (
    <div>
      <PageHeader
        title="Hiring pipeline"
        description="Drag candidates between stages. Open a card for its timeline, comments and attachments."
      />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No applicants yet" description="Applications to your published vacancies will appear here." />
      ) : (
        <div className="-mx-1 overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4 px-1">
            {PIPELINE_STAGES.map((stage) => {
              const cards = columns.get(stage.id) ?? [];
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
                    "flex w-72 flex-col rounded-2xl border border-border bg-secondary/50 p-3 transition-colors",
                    overStage === stage.id && "border-gold bg-gold/10",
                  )}
                >
                  <header className="flex items-center justify-between px-1 pb-3">
                    <h2 className="font-serif text-sm tracking-wide">{stage.label}</h2>
                    <Badge variant="secondary">{cards.length}</Badge>
                  </header>
                  <div className="flex flex-1 flex-col gap-2">
                    {cards.map((card) => (
                      <article
                        key={card.id}
                        draggable
                        onDragStart={() => setDragId(card.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setActive(card)}
                        className={cn(
                          "cursor-pointer rounded-xl border border-border bg-card p-3 shadow-soft transition-shadow hover:shadow-md",
                          dragId === card.id && "opacity-50",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{card.teacher_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{card.job_title}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground">{relativeTime(card.created_at)}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                    {cards.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Drop candidates here
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <ApplicationDetail card={active} onOpenChange={(open) => !open && setActive(null)} />
    </div>
  );
}
