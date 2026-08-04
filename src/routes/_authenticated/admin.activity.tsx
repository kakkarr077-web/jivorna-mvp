import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PageHeader,
  EmptyState,
  LoadingSkeleton,
  SearchInput,
} from "@/components/crm/CrmPrimitives";
import { ActivityCard } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { matchesTerm } from "@/lib/crm";
import { ACTIVITY_FILTERS, fetchActivityFeed, type ActivityEntity } from "@/lib/admin-activity";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: AdminActivity,
});

const PAGE_SIZE = 20;

function AdminActivity() {
  const [filter, setFilter] = useState<ActivityEntity | "all">("all");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: fetchActivityFeed,
  });

  const filtered = useMemo(() => {
    const items = data ?? [];
    return items.filter(
      (item) =>
        (filter === "all" || item.entity === filter) && matchesTerm(search, [item.searchText, item.title]),
    );
  }, [data, filter, search]);

  const visibleItems = filtered.slice(0, visible);

  return (
    <div>
      <PageHeader title="Activity Center" description="A live, reverse-chronological feed of everything happening on Jivorna." />

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setVisible(PAGE_SIZE);
              }}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
                filter === f.value ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setVisible(PAGE_SIZE);
          }}
          placeholder="Search activity…"
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="lines" rows={10} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No activity found" description="Try a different filter or search term." />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) =>
            item.href ? (
              <Link key={item.id} to={item.href} className="block">
                <ActivityCard title={item.title} description={item.description} at={item.at} icon={item.icon} />
              </Link>
            ) : (
              <ActivityCard key={item.id} title={item.title} description={item.description} at={item.at} icon={item.icon} />
            ),
          )}
          {visible < filtered.length && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
