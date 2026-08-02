import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/school/profile")({
  component: SchoolProfile,
});

function SchoolProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: school } = useQuery({
    queryKey: ["school-record", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("*").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!school) return;
    setName(school.name ?? "");
    setCity(school.city ?? "");
    setWebsite(school.website ?? "");
    setDescription(school.description ?? "");
  }, [school]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = { owner_id: user.id, name, city, website, description };
      const { error } = school
        ? await supabase.from("schools").update(payload).eq("id", school.id)
        : await supabase.from("schools").insert(payload);
      if (error) throw error;
      toast.success("School profile saved.");
      void qc.invalidateQueries({ queryKey: ["school-record"] });
      void qc.invalidateQueries({ queryKey: ["school-overview"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save school");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="School profile" description="Teachers see this alongside every role you publish." />

      <form onSubmit={save} className="grid gap-6 rounded-xl border border-border bg-card p-7 shadow-soft">
        <div className="grid gap-2">
          <Label htmlFor="name">School name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Northgate Academy" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Manchester" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">About the school</Label>
          <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button type="submit" size="lg" disabled={saving} className="justify-self-start">
          {saving ? "Saving…" : school ? "Save changes" : "Create school profile"}
        </Button>
      </form>
    </div>
  );
}
