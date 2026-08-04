import { useState } from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, InfoCard } from "@/components/crm/CrmPrimitives";
import { relativeTime } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

export type CrmNote = {
  id: string;
  body: string;
  pinned?: boolean | undefined;
  author?: string | null | undefined;
  created_at: string;
};

/**
 * Presentational notes panel shared by every CRM entity (schools, teachers,
 * leads, applications). Persistence stays with the caller.
 */
export function NotesPanel({
  title = "Internal notes",
  description = "Visible to administrators only.",
  notes,
  onAdd,
  onUpdate,
  onDelete,
  onTogglePin,
  isBusy,
}: {
  title?: string;
  description?: string;
  notes: CrmNote[];
  onAdd: (body: string) => Promise<void> | void;
  onUpdate?: (id: string, body: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onTogglePin?: (id: string, pinned: boolean) => Promise<void> | void;
  isBusy?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const ordered = [...notes].sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    await onAdd(body);
    setDraft("");
  };

  return (
    <InfoCard title={title} description={description}>
      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an internal note…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void submit()} disabled={!draft.trim() || isBusy}>
            Add note
          </Button>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {ordered.length === 0 && (
          <li className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No notes yet.
          </li>
        )}
        {ordered.map((note) => (
          <li
            key={note.id}
            className={cn(
              "rounded-lg border border-border bg-surface p-4",
              note.pinned && "border-gold/40 bg-gold-soft/40",
            )}
          >
            {editingId === note.id ? (
              <div className="space-y-3">
                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (onUpdate && editBody.trim()) await onUpdate(note.id, editBody.trim());
                      setEditingId(null);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <p className="min-w-0 truncate text-xs text-muted-foreground">
                    {note.author ? `${note.author} · ` : ""}
                    {relativeTime(note.created_at)}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    {onTogglePin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={note.pinned ? "Unpin note" : "Pin note"}
                        onClick={() => void onTogglePin(note.id, !note.pinned)}
                      >
                        {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                    )}
                    {onUpdate && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit note"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditBody(note.body);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete note"
                        onClick={() => setPendingDelete(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete this note?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete && onDelete) void onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </InfoCard>
  );
}
