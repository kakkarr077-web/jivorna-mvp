import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, MapPin } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/Primitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/school/teachers")({
  component: BrowseTeachers,
});

type TeacherRow = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  state: string | null;
  qualification: string | null;
  subjects: string[];
  grades: string[];
  experience_years: number;
  available: boolean;
};

function BrowseTeachers() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["school-browse-teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_profiles")
        .select(
          "user_id,full_name,headline,city,state,qualification,subjects,grades,experience_years,available",
        )
        .eq("available", true)
        .order("experience_years", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeacherRow[];
    },
  });

  const q = query.trim().toLowerCase();
  const list = (data ?? []).filter((t) =>
    !q
      ? true
      : [t.full_name, t.headline, t.city, t.qualification, ...(t.subjects ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
  );

  return (
    <div>
      <PageHeader title="Browse teachers" description="Verified educators currently open to new roles." />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, subject or city"
        className="mb-8 h-11 max-w-md bg-card"
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No teachers found" description="Try a different subject, city or keyword." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <article key={t.user_id} className="card-premium card-premium-hover p-5">
              <h3 className="font-serif text-lg">{t.full_name ?? "Teacher"}</h3>
              {t.headline && <p className="mt-1 text-sm text-muted-foreground">{t.headline}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {(t.city || t.state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {[t.city, t.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {t.qualification && (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> {t.qualification}
                  </span>
                )}
                <span>{t.experience_years} yrs experience</span>
              </div>
              {(t.subjects ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.subjects.slice(0, 5).map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
