import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Pin, PinOff, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { relativeTime } from "@/lib/pipeline";

type Note = {
  id: string;
  body: string;
  pinned: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
};

/** Admin-only internal notes. RLS restricts every operation to the admin role. */
export function SchoolNotes({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const notesQuery = useQuery({
    queryKey: ["school-notes", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_notes")
        .select("id,body,pinned,author_id,created_at,updated_at")
        .eq("school_id", schoolId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const authorIds = Array.from(new Set((notesQuery.data ?? []).map((n) => n.author_id)));
  const authorsQuery = useQuery({
    queryKey: ["school-note-authors", authorIds.join(",")],
    enabled: authorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", authorIds);
      return new Map(
        (data ?? []).map((p) => [p.id, p.full_name || p.email || "Admin"] as const),
      );
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["school-notes", schoolId] });

  const addNote = useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("school_notes")
        .insert({ school_id: schoolId, author_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      toast.success("Note added.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add note"),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Note, "body" | "pinned">> }) => {
      const { error } = await supabase.from("school_notes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update note"),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete note"),
  });

  const notes = notesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an internal note — never visible to the school."
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="gold"
            disabled={!draft.trim() || addNote.isPending}
            onClick={() => addNote.mutate(draft.trim())}
          >
            <Plus /> Add note
          </Button>
        </div>
      </div>

      {notesQuery.isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No internal notes yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {authorsQuery.data?.get(n.author_id) ?? "Admin"}
                  </span>
                  <span>{relativeTime(n.created_at)}</span>
                  {n.pinned && <Badge variant="secondary">Pinned</Badge>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={n.pinned ? "Unpin note" : "Pin note"}
                    onClick={() => updateNote.mutate({ id: n.id, patch: { pinned: !n.pinned } })}
                  >
                    {n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit note"
                    onClick={() => {
                      setEditingId(n.id);
                      setEditBody(n.body);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete note"
                    onClick={() => deleteNote.mutate(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {editingId === n.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="gold"
                      disabled={!editBody.trim() || updateNote.isPending}
                      onClick={() => updateNote.mutate({ id: n.id, patch: { body: editBody.trim() } })}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
