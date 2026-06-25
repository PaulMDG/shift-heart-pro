import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, MessageCircle, Phone, AlertCircle, Repeat, Volume2, VolumeX } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useNotifications";
import { isSoundEnabled, setSoundEnabled } from "@/lib/notifySound";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Cat = "all" | "messages" | "calls" | "alerts";

const CATS: { id: Cat; label: string }[] = [
  { id: "all", label: "All" },
  { id: "messages", label: "Chats" },
  { id: "calls", label: "Calls" },
  { id: "alerts", label: "Alerts" },
];

function iconFor(type: string) {
  if (type === "message" || type === "chat") return MessageCircle;
  if (type === "call") return Phone;
  if (type === "swap") return Repeat;
  if (type === "alert") return AlertCircle;
  return Bell;
}

function matches(cat: Cat, type: string) {
  if (cat === "all") return true;
  if (cat === "messages") return type === "message" || type === "chat";
  if (cat === "calls") return type === "call";
  if (cat === "alerts") return type === "alert" || type === "shift" || type === "swap";
  return true;
}

export default function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Cat>("all");
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const { data: notifications = [] } = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.read).length,
    [notifications],
  );

  const filtered = useMemo(
    () => notifications.filter((n: any) => matches(cat, n.type)).slice(0, 20),
    [notifications, cat],
  );

  const counts = useMemo(() => {
    const c: Record<Cat, number> = { all: 0, messages: 0, calls: 0, alerts: 0 };
    for (const n of notifications as any[]) {
      if (n.read) continue;
      c.all++;
      if (matches("messages", n.type)) c.messages++;
      if (matches("calls", n.type)) c.calls++;
      if (matches("alerts", n.type)) c.alerts++;
    }
    return c;
  }, [notifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className={cn("relative focus-ring", className)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 bg-surface text-surface-foreground border border-[hsl(var(--ivory-border))]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--ivory-border))]">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
              aria-label={soundOn ? "Mute sounds" : "Unmute sounds"}
              title={soundOn ? "Sounds on" : "Sounds off"}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unreadCount === 0}
              className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-40 disabled:no-underline px-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all
            </button>
          </div>
        </div>
        <div className="flex gap-1 px-2 py-2 border-b border-[hsl(var(--ivory-border))]">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-full font-medium inline-flex items-center gap-1",
                cat === c.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
              {counts[c.id] > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[9px] px-1.5 leading-4">
                  {counts[c.id]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">
              No {cat === "all" ? "" : cat + " "}notifications yet.
            </p>
          ) : (
            filtered.map((n: any) => {
              const Icon = iconFor(n.type);
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markOne.mutate(n.id);
                    setOpen(false);
                    if (n.type === "message" || n.type === "chat") navigate("/messages");
                    else navigate("/notifications");
                  }}
                  className={cn(
                    "w-full text-left flex gap-2.5 px-3 py-2.5 border-b border-[hsl(var(--ivory-border))]/60 last:border-b-0 transition-colors hover:bg-primary/5",
                    !n.read && "bg-primary/[0.04]",
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-0.5",
                    !n.read ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs truncate", !n.read ? "font-semibold" : "font-medium")}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
        <button
          onClick={() => { setOpen(false); navigate("/notifications"); }}
          className="block w-full text-center text-xs text-primary py-2 border-t border-[hsl(var(--ivory-border))] hover:bg-primary/5"
        >
          View all notifications
        </button>
      </PopoverContent>
    </Popover>
  );
}