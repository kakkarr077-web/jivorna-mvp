import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type DocType = Database["public"]["Enums"]["document_type"];

export type DocumentRow = {
  id: string;
  name: string;
  file_url: string;
  doc_type: DocType;
  file_size_bytes: number | null;
};

const MAX_BYTES = 10 * 1024 * 1024;

export function DocumentUpload({
  userId,
  docType,
  documents,
  multiple,
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg",
  label,
  onChange,
}: {
  userId: string;
  docType: DocType;
  documents: DocumentRow[];
  multiple?: boolean;
  accept?: string;
  label: string;
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is larger than 10 MB`);
          continue;
        }
        const path = `${userId}/${docType}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("teacher-documents")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from("documents").insert({
          owner_id: userId,
          doc_type: docType,
          name: file.name,
          file_url: path,
          file_size_bytes: file.size,
        });
        if (dbErr) throw dbErr;
      }
      toast.success("Upload complete.");
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (doc: DocumentRow) => {
    setBusy(true);
    try {
      await supabase.storage.from("teacher-documents").remove([doc.file_url]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove file");
    } finally {
      setBusy(false);
    }
  };

  const open = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage
      .from("teacher-documents")
      .createSignedUrl(doc.file_url, 60);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="card-premium card-premium-hover flex w-full flex-col items-center gap-3 border-dashed px-6 py-10 text-center"
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        ) : (
          <UploadCloud className="h-6 w-6 text-gold" />
        )}
        <span className="font-serif text-lg">{label}</span>
        <span className="text-xs text-muted-foreground">
          PDF, Word or image · up to 10 MB {multiple ? "· multiple files allowed" : ""}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <button
                type="button"
                onClick={() => void open(doc)}
                className="min-w-0 flex-1 truncate text-left text-sm hover:text-gold"
              >
                {doc.name}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${doc.name}`}
                onClick={() => void remove(doc)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
