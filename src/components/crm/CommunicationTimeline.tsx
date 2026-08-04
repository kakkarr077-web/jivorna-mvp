import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { fetchRecruiters, recruiterName } from "@/lib/recruiters";
import {
  channelMeta,
  deleteCommunication,
  fetchCommunications,
  logCommunication,
  LOGGABLE_CHANNELS,
  type CommChannel,
  type CommEntityType,
} from "@/lib/communications";
import { formatDateTime } from "@/lib/crm";
import { Trash2 } from "lucide-react";

/**
 * Unified communication history for any CRM entity: every call, email, meeting
 * and automated status change in one vertical timeline, with inline logging.
 */
export function CommunicationTimeline({
  entityType,
  entityId,
  title = "Communication history",
}: {
  entityType: CommEntityType;
  entityId: string;
  title?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [channel, setChannel] = useState<CommChannel>("call");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  const key = ["communications", entityType, entityId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchCommunications(entityType, entityId),
  });
  const { data: recruiters } = useQuery({ queryKey: ["recruiters"], queryFn: fetchRecruiters });

  const log = useMutation({
    mutationFn: async () => {
      await logCommunication({
        entityType,
        entityId,
        channel,
        summary: summary.trim(),
        body: body.trim() || null,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        recruiterId: user?.id ?? null,
      });
    },
    onSuccess: () => {
      setSummary("");
      setBody("");
      setOccurredAt("");
      toast.success("Interaction logged.");
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["communications-recent"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not log interaction"),
  });

  const remove = useMutation({
    mutationFn: deleteCommunication,
    onSuccess: () => {
      toast.success("Entry removed.");
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  const entries = useMemo(() => data ?? [], [data]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="font-serif text-lg">{title}</h2>

      <div className="mt-4 space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={channel} onValueChange={(v) => setChannel(v as CommChannel)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOGGABLE_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Summary — e.g. Called principal about shortlist"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <Input
            type="datetime-local"
            className="sm:w-52"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>
        <Textarea
          rows={2}
          placeholder="Notes (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" disabled={!summary.trim() || log.isPending} onClick={() => log.mutate()}>
            Log interaction
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No interactions recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {entries.map((entry) => {
              const meta = channelMeta(entry.channel);
              const Icon = meta.icon;
              return (
                <li key={entry.id} className="group relative">
                  <span className="absolute -left-[27px] flex size-5 items-center justify-center rounded-full border border-border bg-card">
                    <Icon className="size-3 text-muted-foreground" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{entry.summary}</p>
                      {entry.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{entry.body}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {meta.label} · {formatDateTime(entry.occurred_at)}
                        {entry.recruiter_id ? ` · ${recruiterName(recruiters ?? [], entry.recruiter_id)}` : ""}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => remove.mutate(entry.id)}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
