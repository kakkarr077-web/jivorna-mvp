import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/Primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { relativeTime, stageLabel } from "@/lib/pipeline";
import { Paperclip, Download, Trash2, CircleDot } from "lucide-react";

export type PipelineCard = {
  id: string;
  status: string;
  created_at: string;
  cover_letter: string | null;
  teacher_id: string;
  teacher_name: string;
  job_title: string;
};

type EventRow = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  summary: string;
  created_at: string;
};

type CommentRow = { id: string; body: string; internal: boolean; created_at: string; author_id: string };
type AttachmentRow = { id: string; name: string; file_path: string; file_size_bytes: number | null; created_at: string; uploaded_by: string };

export function ApplicationDetail({
  card,
  onOpenChange,
}: {
  card: PipelineCard | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(true);
  const [uploading, setUploading] = useState(false);
  const id = card?.id ?? null;

  const events = useQuery({
    queryKey: ["application-events", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_events")
        .select("id,event_type,from_status,to_status,summary,created_at")
        .eq("application_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const comments = useQuery({
    queryKey: ["application-comments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_comments")
        .select("id,body,internal,created_at,author_id")
        .eq("application_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommentRow[];
    },
  });

  const attachments = useQuery({
    queryKey: ["application-attachments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_attachments")
        .select("id,name,file_path,file_size_bytes,created_at,uploaded_by")
        .eq("application_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttachmentRow[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const body = comment.trim();
      if (!body) throw new Error("Write a comment first.");
      const { error } = await supabase
        .from("application_comments")
        .insert({ application_id: id!, author_id: user!.id, body, internal });
      if (error) throw error;
      await supabase.from("application_events").insert({
        application_id: id!,
        actor_id: user!.id,
        event_type: "comment",
        summary: internal ? "Added an internal note" : "Added a comment visible to the candidate",
      });
    },
    onSuccess: () => {
      setComment("");
      void qc.invalidateQueries({ queryKey: ["application-comments", id] });
      void qc.invalidateQueries({ queryKey: ["application-events", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post comment"),
  });

  const removeComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("application_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["application-comments", id] }),
  });

  const upload = async (file: File) => {
    if (!id || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const path = `${id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("application-attachments").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("application_attachments").insert({
        application_id: id,
        uploaded_by: user.id,
        name: file.name,
        file_path: path,
        file_size_bytes: file.size,
      });
      if (error) throw error;
      await supabase.from("application_events").insert({
        application_id: id,
        actor_id: user.id,
        event_type: "attachment",
        summary: `Attached ${file.name}`,
      });
      toast.success("File attached.");
      void qc.invalidateQueries({ queryKey: ["application-attachments", id] });
      void qc.invalidateQueries({ queryKey: ["application-events", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("application-attachments").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <Sheet open={!!card} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">{card?.teacher_name}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {card?.job_title} · {card ? stageLabel(card.status) : ""} · applied {card ? relativeTime(card.created_at) : ""}
          </p>
        </SheetHeader>

        <div className="px-4 pb-8">
          <Tabs defaultValue="timeline">
            <TabsList className="w-full">
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Attachments</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-5">
              {card?.cover_letter && (
                <div className="mb-5 rounded-xl bg-muted/60 p-4 text-sm leading-relaxed">{card.cover_letter}</div>
              )}
              {(events.data ?? []).length === 0 ? (
                <EmptyState title="No activity yet" description="Stage changes, comments and uploads appear here." />
              ) : (
                <ol className="relative ml-2 border-l border-border pl-6">
                  {(events.data ?? []).map((e) => (
                    <li key={e.id} className="relative pb-6 last:pb-0">
                      <CircleDot className="absolute -left-[31px] top-0.5 size-3.5 text-gold" />
                      <p className="text-sm font-medium">{e.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.from_status && e.to_status ? `${stageLabel(e.from_status)} → ${stageLabel(e.to_status)} · ` : ""}
                        {relativeTime(e.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-5">
              <div className="grid gap-3">
                <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="internal" checked={internal} onCheckedChange={setInternal} />
                    <Label htmlFor="internal" className="text-sm text-muted-foreground">Internal note</Label>
                  </div>
                  <Button size="sm" variant="gold" disabled={addComment.isPending} onClick={() => addComment.mutate()}>
                    Post
                  </Button>
                </div>
              </div>
              <ul className="mt-6 grid gap-3">
                {(comments.data ?? []).map((c) => (
                  <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={c.internal ? "secondary" : "outline"}>{c.internal ? "Internal" : "Shared"}</Badge>
                      <span className="text-xs text-muted-foreground">{relativeTime(c.created_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm">{c.body}</p>
                    {c.author_id === user?.id && (
                      <Button size="sm" variant="ghost" className="mt-2" onClick={() => removeComment.mutate(c.id)}>
                        <Trash2 /> Delete
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="files" className="mt-5">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
              <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Paperclip /> {uploading ? "Uploading…" : "Attach a file"}
              </Button>
              <ul className="mt-5 grid gap-2">
                {(attachments.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.file_size_bytes ? `${Math.round(a.file_size_bytes / 1024)} KB · ` : ""}
                        {relativeTime(a.created_at)}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => void openFile(a.file_path)}>
                      <Download /> Open
                    </Button>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
