import MobileLayout from "@/components/layout/MobileLayout";
import { useShifts } from "@/hooks/useShifts";
import {
  Bell,
  Car,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  MapPin,
  MessageCircle,
  Navigation,
  Shield,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessages } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTime } from "@/lib/format";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { metersToFeet } from "@/hooks/useGeolocation";

const Dashboard = () => {
  const { data: shifts = [] } = useShifts();
  const { data: profile } = useProfile();
  const { data: notifications = [] } = useNotifications();
  const { data: messages = [] } = useMessages?.() ?? ({ data: [] } as any);
  const { data: settings } = useAgencySettings();
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const todayShifts = shifts.filter((s) => s.date === today);
  const upcomingShifts = shifts
    .filter((s) => s.date > today)
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));

  const activeShift =
    todayShifts.find((s) => s.status === "in_progress") ??
    todayShifts.find((s) => s.status === "not_started") ??
    todayShifts[0];

  const nextShift = upcomingShifts[0];

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning," : hour < 18 ? "Good afternoon," : "Good evening,";

  const radiusM = settings?.geofence_radius_m ?? 200;
  const radiusFt = Math.round(metersToFeet(radiusM));

  const todaysTotalMs = todayShifts.reduce((acc, s) => {
    if (s.clock_in_time && s.clock_out_time) {
      return acc + (new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime());
    }
    return acc;
  }, 0);
  const totalH = Math.floor(todaysTotalMs / 3_600_000);
  const totalM = Math.floor((todaysTotalMs % 3_600_000) / 60_000);

  const isClockedIn = activeShift?.status === "in_progress";

  const unreadMessages = Array.isArray(messages)
    ? messages.filter((m: any) => !m.read && m.recipient_id === profile?.id).length
    : 0;
  const recentAlerts = notifications.slice(0, 2);

  const quickAccess = [
    {
      icon: ClipboardCheck,
      label: "Tasks",
      sub: todayShifts.length ? `${todayShifts.length} today` : "View all",
      tone: "bg-primary/15 text-primary",
      path: "/shifts",
    },
    {
      icon: MessageCircle,
      label: "Messages",
      sub: unreadMessages ? `${unreadMessages} new` : "Inbox",
      tone: "bg-info/15 text-info",
      path: "/messages",
    },
    {
      icon: FileText,
      label: "Care Plan",
      sub: "View details",
      tone: "bg-success/15 text-success",
      path: activeShift ? `/shifts/${activeShift.id}` : "/shifts",
    },
    {
      icon: Shield,
      label: "Safety Info",
      sub: "Emergency info",
      tone: "bg-secondary text-foreground",
      path: "/profile",
    },
  ];

  return (
    <MobileLayout>
      <div className="px-5 pt-2 pb-6 space-y-5">
        {/* Greeting */}
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 ring-1 ring-border">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={firstName} />
            <AvatarFallback className="bg-secondary text-foreground font-semibold">
              {firstName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h2 className="font-display text-3xl text-foreground leading-tight truncate">
              {firstName}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              You have{" "}
              <span className="text-primary font-semibold">{todayShifts.length}</span>{" "}
              scheduled visit{todayShifts.length === 1 ? "" : "s"} today.
            </p>
          </div>
        </div>

        {/* Your Shift hero card */}
        <section className="bg-card rounded-3xl p-5 border border-border/50 shadow-[0_4px_24px_-12px_hsl(217_60%_3%/0.6)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] tracking-[0.22em] text-primary font-semibold uppercase">
                Your shift
              </p>
              <h3 className="font-display text-2xl text-foreground mt-2 leading-tight">
                {isClockedIn ? "Clocked in" : "Not clocked in"}
              </h3>
              {activeShift?.client?.address ? (
                <div className="mt-3 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">
                      {activeShift.client.address.split(",").slice(-2).join(",").trim() ||
                        activeShift.client.address}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-[22px]">
                    Within {radiusFt} ft
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-3">
                  No active shift assigned.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => activeShift && navigate(`/shifts/${activeShift.id}`)}
              disabled={!activeShift}
              aria-label={isClockedIn ? "Clock out" : "Clock in"}
              className="relative shrink-0 w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center text-foreground transition-transform active:scale-95 disabled:opacity-40"
              style={{
                border: "2px solid hsl(var(--primary))",
                boxShadow:
                  "0 0 0 1px hsl(var(--primary) / 0.25), 0 0 28px -2px hsl(var(--primary) / 0.45), inset 0 0 0 6px hsl(var(--card))",
              }}
            >
              <Clock className="w-5 h-5 text-primary mb-1" />
              <span className="font-display text-lg leading-none">
                {isClockedIn ? "Clock Out" : "Clock In"}
              </span>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <span className="text-muted-foreground">Today's total</span>
              <span className="text-foreground font-semibold">
                {totalH}h {String(totalM).padStart(2, "0")}m
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/profile/timesheets")}
              className="text-primary text-sm font-medium inline-flex items-center gap-0.5"
            >
              View timesheet
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Up next */}
        {nextShift && (
          <section className="bg-card rounded-3xl p-5 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] tracking-[0.22em] text-primary font-semibold uppercase">
                Up next
              </p>
              <button
                type="button"
                onClick={() => navigate("/shifts")}
                className="text-primary text-sm font-medium inline-flex items-center gap-0.5"
              >
                View full schedule
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-stretch gap-4">
              <div className="text-left">
                <p className="font-display text-2xl text-foreground leading-none">
                  {formatTime(nextShift.start_time)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  – {formatTime(nextShift.end_time)}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
                  <Car className="w-3.5 h-3.5" />
                  <span>Travel time</span>
                </div>
              </div>

              <div className="w-px bg-border/60" />

              <div className="flex-1 min-w-0 flex gap-3">
                <Avatar className="w-12 h-12 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-secondary text-foreground font-semibold">
                    {nextShift.client?.name?.slice(0, 1).toUpperCase() ?? "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-card-foreground truncate">
                    {nextShift.client?.name ?? "Assigned Client"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {nextShift.client?.address || "Address pending"}
                  </p>
                  {nextShift.client?.care_type && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-secondary text-[10px] text-foreground">
                      {nextShift.client.care_type}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/shifts/${nextShift.id}`)}
                aria-label="Directions"
                className="shrink-0 flex flex-col items-center gap-1 text-muted-foreground"
              >
                <span className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-foreground" />
                </span>
                <span className="text-[10px]">Directions</span>
              </button>
            </div>
          </section>
        )}

        {/* Alerts & reminders */}
        {recentAlerts.length > 0 && (
          <section className="bg-card rounded-3xl p-5 border border-border/50">
            <p className="text-[11px] tracking-[0.22em] text-primary font-semibold uppercase mb-3">
              Alerts & Reminders
            </p>
            <ul className="divide-y divide-border/60">
              {recentAlerts.map((n, i) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => navigate("/notifications")}
                    className="w-full flex items-center gap-3 py-3 text-left"
                  >
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        i === 0
                          ? "bg-primary/15 text-primary"
                          : "bg-success/15 text-success"
                      }`}
                    >
                      {i === 0 ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <ClipboardList className="w-4 h-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.message}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Quick access */}
        <section>
          <p className="text-[11px] tracking-[0.22em] text-primary font-semibold uppercase mb-3">
            Quick access
          </p>
          <div className="grid grid-cols-4 gap-3">
            {quickAccess.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => navigate(q.path)}
                className="bg-card border border-border/50 rounded-2xl p-3 flex flex-col items-center text-center gap-2 active:scale-[0.97] transition-transform"
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${q.tone}`}
                >
                  <q.icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold text-foreground leading-tight">
                  {q.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {q.sub}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
