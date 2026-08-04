import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createSavedView, deleteSavedView, fetchSavedViews } from "@/lib/saved-views";
import { useAuth } from "@/hooks/useAuth";

const NONE = "__none";

/** Load / save / delete a named filter preset for the current user + module. */
export function SavedViewsBar({
  module,
  config,
  onApply,
}: {
  module: string;
  config: Record<string, unknown>;
  onApply: (config: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(NONE);

  const key = ["saved-views", module, user?.id];
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchSavedViews(module, user!.id),
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: () => createSavedView({ module, userId: user!.id, name: name.trim(), config }),
    onSuccess: () => {
      toast.success("View saved.");
      setName("");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save view"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSavedView(id),
    onSuccess: () => {
      toast.success("View deleted.");
      setSelected(NONE);
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete view"),
  });

  const views = data ?? [];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selected}
        onValueChange={(v) => {
          setSelected(v);
          if (v === NONE) return;
          const view = views.find((view) => view.id === v);
          if (view) onApply(view.config);
        }}
      >
        <SelectTrigger className="h-9 w-44">
          <Bookmark className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="Saved views" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Saved views…</SelectItem>
          {views.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected !== NONE && (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete saved view"
          onClick={() => remove.mutate(selected)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            <Save className="mr-2 h-4 w-4" /> Save view
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2">
          <p className="text-sm font-medium">Save current filters</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="View name" />
          <Button size="sm" className="w-full" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
