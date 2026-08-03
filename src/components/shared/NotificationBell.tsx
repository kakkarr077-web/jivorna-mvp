import { Link } from "@tanstack/react-router";
import { BadgeCheck, Bell, BellRing, Briefcase, CalendarCheck, CalendarClock, CheckCheck, Eye, FileCheck2, Inbox, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

export function notificationIcon(type: string, title?: string) {
  const t = (title ?? "").toLowerCase();
  if (t.includes("job approved")) return BadgeCheck;
  if (t.includes("sent back") || t.includes("not approved") || t.includes("not successful")) return XCircle;
  if (t.includes("viewed")) return Eye;
  if (t.includes("received") && t.includes("application")) return Inbox;
  if (t.includes("interview accepted")) return CalendarCheck;
  switch (type) {
    case "interview":
      return CalendarClock;
    case "offer":
      return FileCheck2;
    case "job_match":
      return Briefcase;
    case "profile":
      return UserRound;
    default:
      return BellRing;
  }
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationRow({
  item,
  onOpen,
  compact,
}: {
  item: AppNotification;
  onOpen?: (item: AppNotification) => void;
  compact?: boolean;
}) {
  const Icon = notificationIcon(item.type);
  const content = (
    <div
      className={cn(
        "flex gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60",
        !item.read && "bg-primary/5",
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", !item.read ? "font-semibold text-foreground" : "text-foreground/90")}>
          {item.title}
        </p>
        {item.body && <p className={cn("text-xs text-muted-foreground", compact && "line-clamp-2")}>{item.body}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(item.created_at)}</p>
      </div>
      {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-label="Unread" />}
    </div>
  );

  if (item.link) {
    return (
      <Link to={item.link} onClick={() => onOpen?.(item)} className="block">
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className="block w-full text-left" onClick={() => onOpen?.(item)}>
      {content}
    </button>
  );
}

export function NotificationBell() {
  const { items, unreadCount, markRead } = useNotifications();
  const recent = items.slice(0, 8);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground/80 transition-colors hover:bg-muted"
          aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold leading-[18px] text-secondary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-serif text-base">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => markRead.mutate(items.filter((n) => !n.read).map((n) => n.id))}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          <div className="p-1">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              recent.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  compact
                  onOpen={(n) => !n.read && markRead.mutate([n.id])}
                />
              ))
            )}
          </div>
        </ScrollArea>
        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
