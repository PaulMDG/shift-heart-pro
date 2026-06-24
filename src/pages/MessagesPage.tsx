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
  Briefcase,
  CalendarClock,
  Stethoscope,
  Heart,
} from "lucide-react";
import { useConversations, type Conversation } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import QuickContactSheet, { type QuickContact } from "@/components/messages/QuickContactSheet";

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

const QUICK_CONTACTS: Array<{ id: string; label: string; icon: any; tone: string }> = [
  { id: "agency", label: "Agency", icon: Briefcase, tone: "from-[hsl(32_55%_62%)] to-[hsl(28_50%_50%)]" },
  { id: "scheduler", label: "Scheduler", icon: CalendarClock, tone: "from-[hsl(210_70%_55%)] to-[hsl(220_60%_45%)]" },
  { id: "clinical", label: "Clinical Supervisor", icon: Stethoscope, tone: "from-[hsl(152_50%_45%)] to-[hsl(160_55%_38%)]" },
  { id: "family", label: "Family Contact", icon: Heart, tone: "from-[hsl(0_65%_60%)] to-[hsl(340_60%_50%)]" },
];

const MessagesPage = () => {
  const { data: conversations = [], isLoading } = useConversations();
  const { data: settings } = useAgencySettings();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeContact, setActiveContact] = useState<QuickContact | null>(null);

  const resolveContact = (id: string, fallbackLabel: string): QuickContact => {
    const s: any = settings || {};
    switch (id) {
      case "agency":
        return {
          id: "agency",
          label: s.agency_name || fallbackLabel,
          name: s.agency_name,
          phone: s.agency_phone,
          email: s.agency_email,
          documentsUrl: s.documents_url,
        };
      case "scheduler":
        return {
          id: "scheduler",
          label: "Scheduler",
          name: s.scheduler_name,
          phone: s.scheduler_phone,
          email: s.scheduler_email,
        };
      case "clinical":
        return {
          id: "clinical",
          label: "Clinical Supervisor",
          name: s.clinical_supervisor_name,
          phone: s.clinical_supervisor_phone,
          email: s.clinical_supervisor_email,
        };
      case "family":
        return {
          id: "family",
          label: s.family_contact_label || "Family Contact",
          name: s.family_contact_label,
          phone: s.family_contact_phone,
          email: s.family_contact_email,
        };
      default:
        return { id, label: fallbackLabel };
    }
  };

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
          <h2 className="font-display text-2xl text-canvas-foreground">Messages</h2>
          <button
            onClick={() => navigate("/messages/new")}
            aria-label="New message"
            className="focus-ring w-11 h-11 rounded-xl border border-primary/40 flex items-center justify-center text-primary-strong"
          >
            <PencilLine className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Contacts */}
        <section className="bg-surface text-surface-foreground rounded-2xl border border-[hsl(var(--ivory-border))] shadow-soft p-4">
          <p className="text-[11px] tracking-[0.22em] text-primary font-semibold uppercase mb-3">
            Quick Contacts
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
            {QUICK_CONTACTS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveContact(resolveContact(c.id, c.label))}
                className="focus-ring flex flex-col items-center gap-1.5 shrink-0 w-[72px] min-h-[88px] rounded-xl p-1"
                aria-label={`${c.label} quick contact`}
              >
                <span
                  className={cn(
                    "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center shadow-soft",
                    c.tone,
                  )}
                >
                  <c.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </span>
                <span className="text-[11px] font-medium text-surface-foreground text-center leading-tight">
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Category tabs */}
        <div className="bg-surface rounded-2xl border border-[hsl(var(--ivory-border))] shadow-soft p-2 grid grid-cols-5 gap-1">
          {TABS.map((t) => {
            const active = filter === t.id;
            const count = counts[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2 pb-1 rounded-xl relative transition-colors",
                  active ? "bg-primary/10" : "bg-transparent",
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
              className="pl-9 rounded-xl bg-surface text-surface-foreground border-[hsl(var(--ivory-border))]"
            />
          </div>
          <button className="px-3 py-2 rounded-xl border border-[hsl(var(--ivory-border))] bg-surface text-primary text-sm font-medium inline-flex items-center gap-1">
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Conversations */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-surface-foreground">No active conversations</p>
            <p className="text-xs mt-1 max-w-xs mx-auto leading-relaxed">
              Reach out to your agency, scheduler, clinical supervisor, or
              family using Quick Contacts above.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((conv) => (
              <ConvCard key={conv.user_id} conv={conv} onOpen={() => navigate(`/messages/${conv.user_id}`)} />
            ))}
          </div>
        )}

        {/* Quick Communication */}
        <section className="bg-surface text-surface-foreground rounded-2xl border border-[hsl(var(--ivory-border))] shadow-soft p-4">
          <p className="text-[11px] tracking-[0.22em] text-primary font-semibold uppercase mb-3">
            Quick Communication
          </p>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  if (q.id === "call") {
                    const phone = (settings as any)?.agency_phone?.trim();
                    if (phone) {
                      window.location.href = `tel:${phone}`;
                    } else {
                      setActiveContact(resolveContact("agency", "Agency"));
                    }
                  } else {
                    navigate("/messages/new");
                  }
                }}
                className="flex flex-col items-center gap-2"
                aria-label={q.label}
              >
                <span className={cn("w-12 h-12 rounded-full flex items-center justify-center", q.tone)}>
                  <q.icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] text-surface-foreground text-center leading-tight">{q.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <QuickContactSheet
        contact={activeContact}
        open={!!activeContact}
        onClose={() => setActiveContact(null)}
      />
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
          ? "bg-red-500/10 border-red-500/40"
          : "bg-surface text-surface-foreground border-[hsl(var(--ivory-border))] shadow-soft hover:border-primary/40",
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
            <span className="text-sm font-semibold text-surface-foreground truncate">
              {conv.full_name}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
              {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: false })}
            </span>
          </div>
          <p className={cn(
            "text-sm mt-1",
            conv.unread_count > 0 ? "text-surface-foreground font-medium" : "text-muted-foreground",
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