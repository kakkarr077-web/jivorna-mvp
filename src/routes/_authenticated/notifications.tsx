import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BellOff, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { NotificationRow } from "@/components/shared/NotificationBell";
import {
  NOTIFICATION_CATEGORIES,
  useNotificationPrefs,
  useNotifications,
  type NotificationPrefs,
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
  const { items, unreadCount, isLoading, markRead, remove } = useNotifications();
  const { prefs, update } = useNotificationPrefs();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.read) : items),
    [items, filter],
  );

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
          <div className="flex gap-2">
            {(["all", "unread"] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
                className="capitalize"
              >
                {key}
              </Button>
            ))}
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

        <TabsContent value="settings" className="mt-6">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Notification settings</CardTitle>
              <CardDescription>Choose how you want to hear from Jivorna for each type of update.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="hidden grid-cols-[1fr_5rem_5rem] items-center gap-3 border-b border-border pb-2 text-xs uppercase tracking-wide text-muted-foreground sm:grid">
                <span>Type</span>
                <span className="text-center">In-app</span>
                <span className="text-center">Email</span>
              </div>
              {NOTIFICATION_CATEGORIES.map((cat) => {
                const inappKey = `inapp_${cat.key}` as keyof NotificationPrefs;
                const emailKey = `email_${cat.key}` as keyof NotificationPrefs;
                return (
                  <div
                    key={cat.key}
                    className="grid grid-cols-1 gap-3 border-b border-border/60 py-4 last:border-0 sm:grid-cols-[1fr_5rem_5rem] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-center">
                      <span className="text-xs text-muted-foreground sm:hidden">In-app</span>
                      <Switch
                        checked={Boolean(prefs[inappKey])}
                        onCheckedChange={(v) => update.mutate({ [inappKey]: v } as Partial<NotificationPrefs>)}
                        aria-label={`${cat.label} in-app`}
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:justify-center">
                      <span className="text-xs text-muted-foreground sm:hidden">Email</span>
                      <Switch
                        checked={Boolean(prefs[emailKey])}
                        onCheckedChange={(v) => update.mutate({ [emailKey]: v } as Partial<NotificationPrefs>)}
                        aria-label={`${cat.label} email`}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
