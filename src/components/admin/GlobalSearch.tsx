import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useCrmTable";
import { supabase } from "@/integrations/supabase/client";
import { stageLabel } from "@/lib/pipeline";
import { formatDateTime } from "@/lib/crm";

type Hit = { id: string; group: string; title: string; subtitle?: string; path: string };

async function searchEverything(term: string): Promise<Hit[]> {
  const like = `%${term}%`;
  const [schools, teachers, jobs, applications, interviews, leads] = await Promise.all([
    supabase.from("schools").select("id,name,city,board").ilike("name", like).limit(5),
    supabase
      .from("teacher_profiles")
      .select("user_id,full_name,headline,city,email")
      .or(`full_name.ilike.${like},email.ilike.${like},headline.ilike.${like}`)
      .limit(5),
    supabase.from("jobs").select("id,title,location,status").ilike("title", like).limit(5),
    supabase
      .from("applications")
      .select("id,status,created_at,jobs(title),profiles:teacher_id(full_name)")
      .limit(30),
    supabase
      .from("interviews")
      .select("id,scheduled_at,interviewer_name,mode,status")
      .limit(30),
    supabase
      .from("leads")
      .select("id,school_name,city,status,contact_person")
      .or(`school_name.ilike.${like},contact_person.ilike.${like},email.ilike.${like}`)
      .limit(5),
  ]);

  const hits: Hit[] = [];
  const lower = term.toLowerCase();

  for (const s of schools.data ?? [])
    hits.push({
      id: `school-${s.id}`,
      group: "Schools",
      title: s.name,
      subtitle: [s.city, s.board].filter(Boolean).join(" · "),
      path: `/admin/schools/${s.id}`,
    });

  for (const t of teachers.data ?? [])
    hits.push({
      id: `teacher-${t.user_id}`,
      group: "Teachers",
      title: t.full_name || t.email || "Unnamed teacher",
      subtitle: [t.headline, t.city].filter(Boolean).join(" · "),
      path: `/admin/teachers/${t.user_id}`,
    });

  for (const j of jobs.data ?? [])
    hits.push({
      id: `job-${j.id}`,
      group: "Jobs",
      title: j.title,
      subtitle: [j.location, j.status].filter(Boolean).join(" · "),
      path: `/admin/jobs`,
    });

  for (const a of (applications.data ?? []) as unknown as {
    id: string;
    status: string;
    created_at: string;
    jobs: { title: string } | null;
    profiles: { full_name: string | null } | null;
  }[]) {
    const title = a.profiles?.full_name ?? "Candidate";
    const job = a.jobs?.title ?? "";
    if (!`${title} ${job}`.toLowerCase().includes(lower)) continue;
    hits.push({
      id: `application-${a.id}`,
      group: "Applications",
      title: `${title} — ${job}`,
      subtitle: stageLabel(a.status),
      path: `/admin/applications/${a.id}`,
    });
  }

  for (const i of interviews.data ?? []) {
    const label = i.interviewer_name ?? "Interview";
    if (!`${label} ${i.mode} ${i.status}`.toLowerCase().includes(lower)) continue;
    hits.push({
      id: `interview-${i.id}`,
      group: "Interviews",
      title: `${label} · ${i.mode}`,
      subtitle: formatDateTime(i.scheduled_at),
      path: `/admin/interviews`,
    });
  }

  for (const l of leads.data ?? [])
    hits.push({
      id: `lead-${l.id}`,
      group: "Leads",
      title: l.school_name,
      subtitle: [l.contact_person, l.city, l.status].filter(Boolean).join(" · "),
      path: `/admin/leads/${l.id}`,
    });

  return hits.slice(0, 40);
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const debounced = useDebouncedValue(term, 250);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-global-search", debounced],
    queryFn: () => searchEverything(debounced.trim()),
    enabled: open && debounced.trim().length >= 2,
    staleTime: 15_000,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const hit of data ?? []) {
      const list = map.get(hit.group) ?? [];
      list.push(hit);
      map.set(hit.group, list);
    }
    return Array.from(map.entries());
  }, [data]);

  const go = (path: string) => {
    setOpen(false);
    setTerm("");
    void navigate({ to: path } as never);
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4" />
          Search everything
          <kbd className="ml-2 hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">
            Ctrl K
          </kbd>
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={term}
          onValueChange={setTerm}
          placeholder="Search schools, teachers, jobs, applications, interviews, leads…"
        />
        <CommandList>
          {debounced.trim().length < 2 ? (
            <CommandEmpty>Type at least two characters to search.</CommandEmpty>
          ) : isFetching && grouped.length === 0 ? (
            <CommandEmpty>Searching…</CommandEmpty>
          ) : grouped.length === 0 ? (
            <CommandEmpty>No matches found.</CommandEmpty>
          ) : (
            grouped.map(([group, hits]) => (
              <CommandGroup key={group} heading={group}>
                {hits.map((hit) => (
                  <CommandItem key={hit.id} value={`${hit.title} ${hit.subtitle ?? ""} ${hit.id}`} onSelect={() => go(hit.path)}>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{hit.title}</p>
                      {hit.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
