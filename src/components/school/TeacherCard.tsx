import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bookmark, BookmarkCheck, Star, MapPin, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export type TeacherRow = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  state: string | null;
  qualification: string | null;
  subjects: string[];
  grades: string[];
  boards: string[];
  languages: string[];
  experience_years: number;
  expected_salary: number | null;
  current_salary: number | null;
  notice_period_days: number | null;
  available: boolean;
  available_from: string | null;
  profile_photo_url: string | null;
  status: string;
};

export const initials = (name: string | null) =>
  (name ?? "T")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const money = (n: number | null) => (n == null ? "—" : `₹${Number(n).toLocaleString()}`);

export function TeacherCard({
  teacher,
  bookmarked,
  shortlisted,
  compared,
  onBookmark,
  onShortlist,
  onCompare,
}: {
  teacher: TeacherRow;
  bookmarked: boolean;
  shortlisted: boolean;
  compared: boolean;
  onBookmark: () => void;
  onShortlist: () => void;
  onCompare: (next: boolean) => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 font-serif text-primary">
          {initials(teacher.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg">{teacher.full_name ?? "Unnamed teacher"}</h3>
          <p className="truncate text-sm text-muted-foreground">{teacher.headline ?? teacher.qualification ?? "Educator"}</p>
        </div>
        <Badge variant={teacher.available ? "default" : "secondary"}>
          {teacher.available ? "Available" : "Not available"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5" /> {[teacher.city, teacher.state].filter(Boolean).join(", ") || "Location not set"}
        </p>
        <p className="flex items-center gap-2">
          <Briefcase className="size-3.5" /> {teacher.experience_years} yrs experience · Expects {money(teacher.expected_salary)}
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block size-3.5" />
          Notice period: {teacher.notice_period_days != null ? `${teacher.notice_period_days} days` : "—"}
        </p>
      </div>

      {(teacher.subjects.length > 0 || teacher.boards.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {teacher.subjects.slice(0, 4).map((s) => (
            <Badge key={s} variant="outline">{s}</Badge>
          ))}
          {teacher.boards.slice(0, 3).map((b) => (
            <Badge key={b} variant="secondary">{b}</Badge>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <Button size="sm" variant={bookmarked ? "secondary" : "outline"} onClick={onBookmark}>
          {bookmarked ? <BookmarkCheck /> : <Bookmark />}
          {bookmarked ? "Saved" : "Bookmark"}
        </Button>
        <Button size="sm" variant={shortlisted ? "gold" : "outline"} onClick={onShortlist}>
          <Star className={cn(shortlisted && "fill-current")} />
          {shortlisted ? "Shortlisted" : "Shortlist"}
        </Button>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={compared} onCheckedChange={(v) => onCompare(v === true)} />
          Compare
        </label>
      </div>
    </article>
  );
}
