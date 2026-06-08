import { useMemo, useState } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import {
  AlertTriangle,
  ArrowLeftRight,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  PencilLine,
  Phone,
  Search,
  SlidersHorizontal,
  Users,
  User as UserIcon,
} from "lucide-react";
import { useConversations, type Conversation } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Filter = "all" | "admin" | "family" | "alert" | "handoff";

const TABS: { id: Filter; label: string; icon: any; tone: string; badgeBg: string }[] = [
  { id: "all", label: "All Messages", icon: MessageCircle, tone: "text-primary", badgeBg: "bg-primary text-primary-foreground" },
  { id: "admin", label: "Admin", icon: UserIcon, tone: "text-purple-300", badgeBg: "bg-purple-500 text-white" },
  { id: "family", label: "Family", icon: Users, tone: "text-emerald-300", badgeBg: "bg-emerald-500 text-white" },
  { id: "alert", label: "Alerts", icon: AlertTriangle, tone: "text-red-300", badgeBg: "bg-red-500 text-white" },
  { id: "handoff", label: "Handoffs", icon: ArrowLeftRight, tone: "text-sky-300", badgeBg: "bg-sky-500 text-white" },
];

function categoryBadge(cat?: string) {
  switch (cat) {
    case "admin":
      return { label: "ADMIN", className: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
    case "family":
      return { label: "FAMILY", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    case "alert":
      return { label: "ALERT", className: "bg-red-500/15 text-red-300 border-red-500/30" };
    case "handoff":
      return { label: "HANDOFF", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
    default:
      return null;
  }
}

const QUICK_ACTIONS = [
  { id: "voice", label: "Voice message", icon: Mic, tone: "bg-purple-500/15 text-purple-300" },
  { id: "photo", label: "Send photo", icon: ImageIcon, tone: "bg-emerald-500/15 text-emerald-300" },
  { id: "doc", label: "Send document", icon: FileText, tone: "bg-sky-500/15 text-sky-300" },
  { id: "call", label: "Call agency", icon: Phone, tone: "bg-primary/15 text-primary" },
];

const MessagesPage = () => {
  const { data: conversations = [], isLoading } = useConversations();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, admin: 0, family: 0, alert: 0, handoff: 0 };
    for (const conv of conversations) {
      c.all += conv.unread_count;
      const cat = (conv.category || "general") as Filter;
      if (cat in c && cat !== "all") c[cat] += conv.unread_count;
    }
    return c;
  }, [conversations]);

  const filtered = useMemo(() => {
    return conversations
      .filter((c) => (filter === "all" ? true : (c.category || "general") === filter))
      .filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()));
  }, [conversations, filter, search]);

  return (
    <MobileLayout>
      <div className="px-4 pt-3 pb-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-2xl text-foreground">Messages</h2>
          <button
            onClick={() => navigate("/messages/new")}
            aria-label="New message"
            className="w-9 h-9 rounded-xl border border-primary/40 flex items-center justify-center text-primary"
          >
            <PencilLine className="w-4 h-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="bg-card/40 rounded-2xl border border-border/40 p-2 grid grid-cols-5 gap-1">
          {TABS.map((t) => {
            const active = filter === t.id;
            const count = counts[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2 pb-1 rounded-xl relative transition-colors",
                  active ? "bg-card" : "bg-transparent",
                )}
              >
                <div className="relative">
                  <t.icon className={cn("w-5 h-5", active ? t.tone : "text-muted-foreground")} />
                  {count > 0 && (
                    <span className={cn(
                      "absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      t.badgeBg,
                    )}>
                      {count}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] leading-tight font-medium",
                  active ? t.tone : "text-muted-foreground",
                )}>
                  {t.label}
                </span>
                {active && <span className="absolute bottom-0 h-[2px] w-8 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-card/60 border-border/60"
            />
          </div>
          <button className="px-3 py-2 rounded-xl border border-border/60 text-primary text-sm font-medium inline-flex items-center gap-1">
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Conversations */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No conversations</p>
            <p className="text-xs mt-1">Tap the pencil to start a new chat</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((conv) => (
              <ConvCard key={conv.user_id} conv={conv} onOpen={() => navigate(`/messages/${conv.user_id}`)} />
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  if (q.id === "call") {
                    window.location.href = "tel:+18005550199";
                  } else {
                    navigate("/messages/new");
                  }
                }}
                className="flex flex-col items-center gap-2"
              >
                <span className={cn("w-12 h-12 rounded-full flex items-center justify-center", q.tone)}>
                  <q.icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] text-foreground text-center leading-tight">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

function ConvCard({ conv, onOpen }: { conv: Conversation; onOpen: () => void }) {
  const badge = categoryBadge(conv.category);
  const initials = conv.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const isAlert = conv.category === "alert";
  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-full text-left rounded-2xl p-4 border transition-colors",
        isAlert
          ? "bg-red-500/5 border-red-500/30"
          : "bg-card border-border/50 hover:border-border",
      )}
    >
      <div className="flex items-start gap-3">
        {isAlert ? (
          <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
        ) : (
          <Avatar className="w-11 h-11 shrink-0">
            <AvatarImage src={conv.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {badge && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md border font-semibold tracking-wide",
                badge.className,
              )}>
                {badge.label}
              </span>
            )}
            <span className="text-sm font-semibold text-foreground truncate">
              {conv.full_name}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
              {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: false })}
            </span>
          </div>
          <p className={cn(
            "text-sm mt-1",
            conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground",
          )}>
            {conv.last_message}
          </p>
        </div>
        {conv.unread_count > 0 && (
          <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </div>
    </button>
  );
}

export default MessagesPage;