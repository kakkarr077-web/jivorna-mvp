import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, ArchiveRestore, BellOff, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotificationRow } from "@/components/shared/NotificationBell";
import {
  NOTIFICATION_CATEGORIES,
  useNotificationPrefs,
  useNotifications,
} from "@/hooks/useNotifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Jivorna" },
      { name: "description", content: "Your Jivorna notification centre: interviews, application updates, offers and job matches." },
      { property: "og:title", content: "Notifications | Jivorna" },
      { property: "og:description", content: "Track interviews, application updates, offers and new job matches in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { items, archivedItems, unreadCount, isLoading, markRead, remove, archive, unarchive } = useNotifications();
  const { prefs, update } = useNotificationPrefs();
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");
  const [type, setType] = useState("all");

  const types = useMemo(
    () => Array.from(new Set([...items, ...archivedItems].map((n) => n.type))).sort(),
    [items, archivedItems],
  );

  const visible = useMemo(() => {
    const base = tab === "archived" ? archivedItems : tab === "unread" ? items.filter((n) => !n.read) : items;
    return type === "all" ? base : base.filter((n) => n.type === type);
  }, [tab, type, items, archivedItems]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-secondary">Notification centre</p>
          <h1 className="font-serif text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Interviews, application updates, offers and new job matches — all in one place.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => markRead.mutate(items.filter((n) => !n.read).map((n) => n.id))}>
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        )}
      </header>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            Inbox
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["all", "unread", "archived"] as const).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={tab === key ? "default" : "outline"}
                  onClick={() => setTab(key)}
                  className="capitalize"
                >
                  {key}
                </Button>
              ))}
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="card-premium">
            <CardContent className="p-2">
              {isLoading ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                  <BellOff className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nothing here yet — new activity will appear instantly.</p>
                </div>
              ) : (
                visible.map((item) => (
                  <div key={item.id} className="group flex items-start gap-1">
                    <div className="min-w-0 flex-1">
                      <NotificationRow item={item} onOpen={(n) => !n.read && markRead.mutate([n.id])} />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-2 h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={item.archived ? "Unarchive notification" : "Archive notification"}
                      onClick={() => (item.archived ? unarchive([item.id]) : archive([item.id]))}
                    >
                      {item.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-2 h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Delete notification"
                      onClick={() => remove.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-4">
          <Card className="card-premium">
            <CardContent className="divide-y divide-border p-0">
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      In-app
                      <Switch
                        checked={Boolean(prefs[`inapp_${cat.key}` as keyof typeof prefs])}
                        onCheckedChange={(v) => update.mutate({ [`inapp_${cat.key}`]: v })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Email
                      <Switch
                        checked={Boolean(prefs[`email_${cat.key}` as keyof typeof prefs])}
                        onCheckedChange={(v) => update.mutate({ [`email_${cat.key}`]: v })}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
