import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/teacher/profile")({
  component: TeacherProfile,
});

function TeacherProfile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState("");
  const [years, setYears] = useState("0");
  const [location, setLocation] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["teacher-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: profile }, { data: teacher }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
        supabase.from("teacher_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
      ]);
      return { profile, teacher };
    },
  });

  useEffect(() => {
    if (!data) return;
    setFullName(data.profile?.full_name ?? "");
    setHeadline(data.teacher?.headline ?? "");
    setBio(data.teacher?.bio ?? "");
    setSubjects((data.teacher?.subjects ?? []).join(", "));
    setYears(String(data.teacher?.experience_years ?? 0));
    setLocation(data.teacher?.location ?? "");
    setAvailable(data.teacher?.available ?? true);
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
      if (pErr) throw pErr;
      const { error } = await supabase.from("teacher_profiles").upsert({
        user_id: user.id,
        headline,
        bio,
        subjects: subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        experience_years: Number(years) || 0,
        location,
        available,
      });
      if (error) throw error;
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="My profile" description="This is what verified schools see when you apply." />

      <form onSubmit={save} className="grid gap-6 rounded-xl border border-border bg-card p-7 shadow-soft">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Head of Mathematics · 8 years secondary"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subjects">Subjects (comma separated)</Label>
            <Input id="subjects" value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Maths, Physics" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="years">Years of experience</Label>
            <Input id="years" type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location">Preferred location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="London" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">Professional summary</Label>
          <Textarea id="bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium">Open to opportunities</p>
            <p className="text-xs text-muted-foreground">Schools can see your profile while this is on.</p>
          </div>
          <Switch checked={available} onCheckedChange={setAvailable} />
        </div>
        <Button type="submit" size="lg" disabled={saving} className="justify-self-start">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
