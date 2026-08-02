import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TeacherCard, money, type TeacherRow } from "@/components/school/TeacherCard";
import { Search, SlidersHorizontal, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/school/teachers")({
  component: BrowseTeachers,
});

const BOARDS = ["CBSE", "ICSE", "IB", "IGCSE", "State Board"];
const QUALIFICATIONS = ["B.Ed", "M.Ed", "B.A", "M.A", "B.Sc", "M.Sc", "Ph.D"];
const NOTICE = [
  { label: "Any notice period", value: "any" },
  { label: "Immediate (0 days)", value: "0" },
  { label: "Up to 15 days", value: "15" },
  { label: "Up to 30 days", value: "30" },
  { label: "Up to 60 days", value: "60" },
  { label: "Up to 90 days", value: "90" },
];

type SavedRow = { teacher_id: string; list_type: string };

function BrowseTeachers() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const [subject, setSubject] = useState("");
  const [city, setCity] = useState("");
  const [qualification, setQualification] = useState("any");
  const [board, setBoard] = useState("any");
  const [notice, setNotice] = useState("any");
  const [experience, setExperience] = useState<number[]>([0]);
  const [salary, setSalary] = useState<number[]>([200000]);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["browse-teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_profiles")
        .select(
          "user_id,full_name,headline,city,state,qualification,subjects,grades,boards,languages,experience_years,expected_salary,current_salary,notice_period_days,available,available_from,profile_photo_url,status",
        )
        .order("experience_years", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeacherRow[];
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["saved-teachers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_teachers")
        .select("teacher_id,list_type")
        .eq("school_owner_id", user!.id);
      if (error) throw error;
      return (data ?? []) as SavedRow[];
    },
  });

  const bookmarks = useMemo(
    () => new Set((saved ?? []).filter((s) => s.list_type === "bookmark").map((s) => s.teacher_id)),
    [saved],
  );
  const shortlist = useMemo(
    () => new Set((saved ?? []).filter((s) => s.list_type === "shortlist").map((s) => s.teacher_id)),
    [saved],
  );

  const toggleSaved = useMutation({
    mutationFn: async ({ teacherId, listType, on }: { teacherId: string; listType: "bookmark" | "shortlist"; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from("saved_teachers")
          .insert({ school_owner_id: user!.id, teacher_id: teacherId, list_type: listType });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_teachers")
          .delete()
          .eq("school_owner_id", user!.id)
          .eq("teacher_id", teacherId)
          .eq("list_type", listType);
        if (error) throw error;
      }
      return { listType, on };
    },
    onSuccess: ({ listType, on }) => {
      toast.success(`${listType === "bookmark" ? "Bookmark" : "Shortlist"} ${on ? "added" : "removed"}.`);
      void qc.invalidateQueries({ queryKey: ["saved-teachers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const results = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const subj = subject.trim().toLowerCase();
    const c = city.trim().toLowerCase();
    const maxNotice = notice === "any" ? null : Number(notice);
    return (teachers ?? []).filter((t) => {
      if (onlyAvailable && !t.available) return false;
      if (t.experience_years < (experience[0] ?? 0)) return false;
      if (t.expected_salary != null && t.expected_salary > (salary[0] ?? Infinity)) return false;
      if (qualification !== "any" && !(t.qualification ?? "").toLowerCase().includes(qualification.toLowerCase())) return false;
      if (board !== "any" && !(t.boards ?? []).includes(board)) return false;
      if (maxNotice != null && (t.notice_period_days ?? 999) > maxNotice) return false;
      if (subj && !(t.subjects ?? []).some((s) => s.toLowerCase().includes(subj))) return false;
      if (c && ![t.city, t.state].some((v) => (v ?? "").toLowerCase().includes(c))) return false;
      if (k) {
        const hay = [
          t.full_name,
          t.headline,
          t.qualification,
          t.city,
          t.state,
          ...(t.subjects ?? []),
          ...(t.grades ?? []),
          ...(t.boards ?? []),
          ...(t.languages ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });
  }, [teachers, keyword, subject, city, qualification, board, notice, experience, salary, onlyAvailable]);

  const compared = (teachers ?? []).filter((t) => compare.includes(t.user_id));

  const reset = () => {
    setKeyword("");
    setSubject("");
    setCity("");
    setQualification("any");
    setBoard("any");
    setNotice("any");
    setExperience([0]);
    setSalary([200000]);
    setOnlyAvailable(true);
  };

  return (
    <div>
      <PageHeader title="Browse teachers" description="Search verified educators, bookmark favourites, shortlist and compare." />

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-lg">
              <SlidersHorizontal className="size-4" /> Filters
            </h2>
            <Button size="sm" variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>

          <div className="mt-5 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Physics" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
            </div>
            <div className="grid gap-2">
              <Label>Qualification</Label>
              <Select value={qualification} onValueChange={setQualification}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any qualification</SelectItem>
                  {QUALIFICATIONS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Board experience</Label>
              <Select value={board} onValueChange={setBoard}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any board</SelectItem>
                  {BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notice period</Label>
              <Select value={notice} onValueChange={setNotice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTICE.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Minimum experience: {experience[0]} yrs</Label>
              <Slider min={0} max={30} step={1} value={experience} onValueChange={setExperience} />
            </div>
            <div className="grid gap-2">
              <Label>Max expected salary: {money(salary[0] ?? 0)}</Label>
              <Slider min={10000} max={200000} step={5000} value={salary} onValueChange={setSalary} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <Label htmlFor="avail" className="text-sm">Available only</Label>
              <Switch id="avail" checked={onlyAvailable} onCheckedChange={setOnlyAvailable} />
            </div>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search by name, subject, board, language…"
              />
            </div>
            <Button variant="outline" disabled={compared.length < 2} onClick={() => setCompareOpen(true)}>
              Compare ({compared.length})
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {isLoading ? "Searching…" : `${results.length} teacher${results.length === 1 ? "" : "s"} match your filters`}
          </p>

          {compare.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {compared.map((t) => (
                <Badge key={t.user_id} variant="secondary" className="gap-1">
                  {t.full_name ?? "Teacher"}
                  <button type="button" aria-label="Remove from compare" onClick={() => setCompare(compare.filter((id) => id !== t.user_id))}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {!isLoading && results.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No teachers match" description="Try widening the experience, salary or board filters." />
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {results.map((t) => (
                <TeacherCard
                  key={t.user_id}
                  teacher={t}
                  bookmarked={bookmarks.has(t.user_id)}
                  shortlisted={shortlist.has(t.user_id)}
                  compared={compare.includes(t.user_id)}
                  onBookmark={() =>
                    toggleSaved.mutate({ teacherId: t.user_id, listType: "bookmark", on: !bookmarks.has(t.user_id) })
                  }
                  onShortlist={() =>
                    toggleSaved.mutate({ teacherId: t.user_id, listType: "shortlist", on: !shortlist.has(t.user_id) })
                  }
                  onCompare={(next) =>
                    setCompare((prev) =>
                      next ? (prev.length >= 4 ? prev : [...prev, t.user_id]) : prev.filter((id) => id !== t.user_id),
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl overflow-x-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Compare teachers</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="w-40 p-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Field</th>
                {compared.map((t) => (
                  <th key={t.user_id} className="p-2 text-left font-serif text-base">{t.full_name ?? "Teacher"}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Location", (t: TeacherRow) => [t.city, t.state].filter(Boolean).join(", ") || "—"],
                ["Qualification", (t: TeacherRow) => t.qualification ?? "—"],
                ["Experience", (t: TeacherRow) => `${t.experience_years} yrs`],
                ["Subjects", (t: TeacherRow) => (t.subjects ?? []).join(", ") || "—"],
                ["Grades", (t: TeacherRow) => (t.grades ?? []).join(", ") || "—"],
                ["Boards", (t: TeacherRow) => (t.boards ?? []).join(", ") || "—"],
                ["Languages", (t: TeacherRow) => (t.languages ?? []).join(", ") || "—"],
                ["Expected salary", (t: TeacherRow) => money(t.expected_salary)],
                ["Notice period", (t: TeacherRow) => (t.notice_period_days != null ? `${t.notice_period_days} days` : "—")],
                ["Availability", (t: TeacherRow) => (t.available ? "Available" : "Not available")],
              ] as [string, (t: TeacherRow) => string][]).map(([label, get]) => (
                <tr key={label} className="border-t border-border">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {compared.map((t) => (
                    <td key={t.user_id} className="p-2">{get(t)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
