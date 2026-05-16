import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAllShifts, useAllClients, useAllCaregivers, useAllSwapRequests, useAdminApproveSwap, useAdminDeclineSwap, useUpdateUserRole } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Users, UserCheck, ArrowRightLeft, Clock, CheckCircle2, AlertTriangle, Loader2, Check, X, DollarSign, FileText, Settings, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import CaregiverDetailSheet from "@/components/admin/CaregiverDetailSheet";
import ClientDetailSheet from "@/components/admin/ClientDetailSheet";
import {
  buildCaregiverFailureCounts,
  evaluateShiftSuspicion,
  type SuspicionResult,
} from "@/lib/suspiciousShift";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { formatDate, formatTime } from "@/lib/format";

const tabs = ["Overview", "Swaps", "Shifts", "Suspicious", "Clients", "Caregivers"] as const;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Overview");
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const { data: shifts = [], isLoading: shiftsLoading } = useAllShifts();
  const { data: clients = [], isLoading: clientsLoading } = useAllClients();
  const { data: caregivers = [] } = useAllCaregivers();
  const { data: swapRequests = [] } = useAllSwapRequests();
  const { data: settings } = useAgencySettings();
  const approveSwap = useAdminApproveSwap();
  const declineSwap = useAdminDeclineSwap();
  const updateRole = useUpdateUserRole();
  const navigate = useNavigate();

  useRealtimeSync([]);

  const pendingSwaps = swapRequests.filter((r: any) => r.status === "pending");
  const today = new Date().toISOString().split("T")[0];
  const todayShifts = shifts.filter((s) => s.date === today);
  const activeShifts = shifts.filter((s) => s.status === "in_progress");
  const completedShifts = shifts.filter((s) => s.status === "completed");

  const thresholds = useMemo(
    () =>
      settings
        ? {
            geofence_radius_m: settings.geofence_radius_m,
            accuracy_threshold_m: settings.accuracy_threshold_m,
            repeat_failure_threshold: settings.repeat_failure_threshold,
          }
        : undefined,
    [settings],
  );
  const failureCountsAll = useMemo(
    () => buildCaregiverFailureCounts(shifts as any, thresholds),
    [shifts, thresholds],
  );
  const suspiciousShifts = useMemo(
    () =>
      shifts
        .map((s: any) => ({
          shift: s,
          suspicion: evaluateShiftSuspicion(
            s,
            s.caregiver_id ? failureCountsAll.get(s.caregiver_id) ?? 0 : 0,
            thresholds,
          ),
        }))
        .filter((e) => e.suspicion.suspicious)
        .sort((a, b) => {
          const sev = (x: string) => (x === "high" ? 2 : x === "warn" ? 1 : 0);
          const d = sev(b.suspicion.severity) - sev(a.suspicion.severity);
          if (d !== 0) return d;
          return (b.shift.date || "").localeCompare(a.shift.date || "");
        }),
    [shifts, failureCountsAll, thresholds],
  );

  const handleApprove = async (id: string) => {
    try {
      await approveSwap.mutateAsync(id);
      toast.success("Swap request approved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await declineSwap.mutateAsync(id);
      toast.success("Swap request declined");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const stats = [
    { icon: CalendarDays, label: "Today", value: todayShifts.length, color: "text-primary", onClick: () => setActiveTab("Shifts") },
    { icon: Clock, label: "Active", value: activeShifts.length, color: "text-info", onClick: () => setActiveTab("Shifts") },
    { icon: CheckCircle2, label: "Done", value: completedShifts.length, color: "text-success", onClick: () => navigate("/admin/timesheets") },
    { icon: ArrowRightLeft, label: "Swaps", value: pendingSwaps.length, color: "text-warning", onClick: () => setActiveTab("Swaps") },
    // Also accessible via /admin/swaps for dedicated approval screen
    { icon: Users, label: "Clients", value: clients.length, color: "text-accent-foreground", onClick: () => setActiveTab("Clients") },
    { icon: UserCheck, label: "Staff", value: caregivers.length, color: "text-primary", onClick: () => setActiveTab("Caregivers") },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Admin Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage shifts, clients & staff</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/admin/timesheets")}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
            >
              <FileText className="w-4 h-4 text-accent-foreground" />
            </button>
            <button
              onClick={() => navigate("/admin/billing")}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
            >
              <DollarSign className="w-4 h-4 text-accent-foreground" />
            </button>
            <button
              onClick={() => navigate("/admin/settings")}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
            >
              <Settings className="w-4 h-4 text-accent-foreground" />
            </button>
            <button
              onClick={() => navigate("/admin/geofence-test")}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
              title="Geofence Test"
            >
              <MapPin className="w-4 h-4 text-accent-foreground" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === tab ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {tab}
              {tab === "Swaps" && pendingSwaps.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {pendingSwaps.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <OverviewTab
            stats={stats}
            pendingSwaps={pendingSwaps}
            todayShifts={todayShifts}
            shiftsLoading={shiftsLoading}
            handleApprove={handleApprove}
            handleDecline={handleDecline}
            swapLoading={approveSwap.isPending || declineSwap.isPending}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "Swaps" && (
          <SwapsTab
            swapRequests={swapRequests}
            handleApprove={handleApprove}
            handleDecline={handleDecline}
            loading={approveSwap.isPending || declineSwap.isPending}
          />
        )}

        {activeTab === "Shifts" && (
          <ShiftsTab shifts={shifts} shiftsLoading={shiftsLoading} navigate={navigate} thresholds={thresholds} />
        )}

        {activeTab === "Suspicious" && (
          <SuspiciousTab items={suspiciousShifts} loading={shiftsLoading} />
        )}

        {activeTab === "Clients" && (
          <ClientsTab
            clients={clients}
            clientsLoading={clientsLoading}
            navigate={navigate}
            onClientClick={setSelectedClient}
          />
        )}

        {activeTab === "Caregivers" && (
          <CaregiversTab
            caregivers={caregivers}
            updateRole={updateRole}
            navigate={navigate}
            onCaregiverClick={setSelectedCaregiver}
          />
        )}
      </div>

      <CaregiverDetailSheet
        caregiver={selectedCaregiver}
        open={!!selectedCaregiver}
        onClose={() => setSelectedCaregiver(null)}
      />
      <ClientDetailSheet
        client={selectedClient}
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </MobileLayout>
  );
};

// --- Sub-components ---

const statusStyles: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-primary/15 text-primary" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  missed: { label: "Missed", className: "bg-destructive/15 text-destructive" },
};

function ShiftRow({ shift, suspicion }: { shift: any; suspicion?: SuspicionResult }) {
  const navigate = useNavigate();
  const st = statusStyles[shift.status] ?? statusStyles.not_started;
  const previewCoords =
    shift.clock_in_lat != null && shift.clock_in_lng != null
      ? { lat: shift.clock_in_lat, lng: shift.clock_in_lng, label: "Clock-in" }
      : shift.clock_out_lat != null && shift.clock_out_lng != null
      ? { lat: shift.clock_out_lat, lng: shift.clock_out_lng, label: "Clock-out" }
      : shift.client?.lat != null && shift.client?.lng != null
      ? { lat: shift.client.lat, lng: shift.client.lng, label: "Client" }
      : null;
  return (
    <div
      onClick={() => navigate(`/admin/shifts/${shift.id}`)}
      className="bg-card rounded-2xl p-4 border border-border cursor-pointer hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-card-foreground text-sm flex items-center gap-1.5">
          {shift.client?.name}
          {suspicion?.suspicious && (
            <span
              title={suspicion.reasons.join(" • ")}
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                suspicion.severity === "high"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-warning/15 text-warning"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Suspicious
            </span>
          )}
        </h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{shift.date} · {shift.start_time} – {shift.end_time}</p>
      {shift.caregiver && (
        <p className="text-xs text-muted-foreground mt-1">👤 {shift.caregiver.full_name}</p>
      )}
      {suspicion?.suspicious && (
        <ul className="mt-2 text-[10px] text-muted-foreground list-disc list-inside space-y-0.5">
          {suspicion.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
      {suspicion?.suspicious && previewCoords && (
        <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <iframe
            title={`Map preview ${shift.id}`}
            width="100%"
            height="110"
            loading="lazy"
            style={{ border: 0, borderRadius: 12 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${previewCoords.lng - 0.004},${previewCoords.lat - 0.0025},${previewCoords.lng + 0.004},${previewCoords.lat + 0.0025}&layer=mapnik&marker=${previewCoords.lat},${previewCoords.lng}`}
          />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
            {shift.clock_in_lat != null && shift.clock_in_lng != null && (
              <a
                href={`https://www.google.com/maps?q=${shift.clock_in_lat},${shift.clock_in_lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Clock-in coords
              </a>
            )}
            {shift.clock_out_lat != null && shift.clock_out_lng != null && (
              <a
                href={`https://www.google.com/maps?q=${shift.clock_out_lat},${shift.clock_out_lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Clock-out coords
              </a>
            )}
            {shift.client?.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shift.client.address)}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Client address
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const swapStatusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning" },
  accepted: { label: "Accepted", className: "bg-success/15 text-success" },
  declined: { label: "Declined", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

function SwapRow({ req, onApprove, onDecline, loading }: { req: any; onApprove: (id: string) => void; onDecline: (id: string) => void; loading: boolean }) {
  const st = swapStatusStyles[req.status] ?? swapStatusStyles.pending;
  return (
    <div className="bg-card rounded-2xl p-4 border border-border space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-card-foreground text-sm">{req.shift?.client?.name || "Unknown"}</h4>
          <p className="text-xs text-muted-foreground">{req.shift?.date} · {req.shift?.start_time} – {req.shift?.end_time}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.className}`}>{st.label}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        From: <span className="font-medium text-foreground">{req.requester?.full_name}</span>
        {req.target && <> → <span className="font-medium text-foreground">{req.target.full_name}</span></>}
      </p>
      {req.status === "pending" && (
        <div className="flex gap-2">
          <button onClick={() => onApprove(req.id)} disabled={loading} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
          </button>
          <button onClick={() => onDecline(req.id)} disabled={loading} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-border text-xs font-semibold text-foreground disabled:opacity-50">
            <X className="w-3 h-3" /> Decline
          </button>
        </div>
      )}
    </div>
  );
}

function CaregiverAvatar({ caregiver }: { caregiver: any }) {
  if (caregiver.avatar_url) {
    return (
      <img
        src={caregiver.avatar_url}
        alt={caregiver.full_name || "Caregiver"}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
      <span className="text-primary-foreground font-bold text-sm">
        {(caregiver.full_name || "?")[0].toUpperCase()}
      </span>
    </div>
  );
}

// Tab components

function OverviewTab({ stats, pendingSwaps, todayShifts, shiftsLoading, handleApprove, handleDecline, swapLoading, setActiveTab }: any) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s: any) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="bg-card rounded-2xl p-3 border border-border text-center hover:border-primary/40 hover:shadow-sm active:scale-[0.98] transition-all"
          >
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-bold text-card-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
          </button>
        ))}
      </div>
      {pendingSwaps.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Pending Swap Approvals
          </h3>
          <div className="space-y-2">
            {pendingSwaps.slice(0, 3).map((req: any) => (
              <SwapRow key={req.id} req={req} onApprove={handleApprove} onDecline={handleDecline} loading={swapLoading} />
            ))}
            {pendingSwaps.length > 3 && (
              <button onClick={() => setActiveTab("Swaps")} className="text-xs text-primary font-semibold">
                View all {pendingSwaps.length} requests →
              </button>
            )}
          </div>
        </section>
      )}
      <section>
        <h3 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wider">Today's Shifts</h3>
        {shiftsLoading ? (
          <Skeleton className="h-20 rounded-2xl" />
        ) : todayShifts.length > 0 ? (
          <div className="space-y-2">
            {todayShifts.map((s: any) => (
              <ShiftRow key={s.id} shift={s} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground bg-card rounded-2xl p-6 text-center border border-border">No shifts scheduled today</p>
        )}
      </section>
    </div>
  );
}

function SwapsTab({ swapRequests, handleApprove, handleDecline, loading }: any) {
  return (
    <div className="space-y-3">
      {swapRequests.length > 0 ? (
        swapRequests.map((req: any) => (
          <SwapRow key={req.id} req={req} onApprove={handleApprove} onDecline={handleDecline} loading={loading} />
        ))
      ) : (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">No swap requests</p>
      )}
    </div>
  );
}

function ShiftsTab({ shifts, shiftsLoading, navigate }: any) {
  const [search, setSearch] = useState("");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);

  const failureCounts = useMemo(() => buildCaregiverFailureCounts(shifts), [shifts]);

  const enriched = useMemo(
    () =>
      shifts.map((s: any) => ({
        shift: s,
        suspicion: evaluateShiftSuspicion(
          s,
          s.caregiver_id ? failureCounts.get(s.caregiver_id) ?? 0 : 0,
        ),
      })),
    [shifts, failureCounts],
  );

  const suspiciousCount = useMemo(
    () => enriched.filter((e: any) => e.suspicion.suspicious).length,
    [enriched],
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (suspiciousOnly) list = list.filter((e: any) => e.suspicion.suspicious);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ shift: s }: any) =>
        s.client?.name?.toLowerCase().includes(q) ||
        s.date?.includes(q) ||
        s.status?.toLowerCase().includes(q) ||
        s.caregiver?.full_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, search, suspiciousOnly]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by client, caregiver, date, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSuspiciousOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            suspiciousOnly
              ? "bg-destructive/15 text-destructive border border-destructive/30"
              : "bg-muted text-muted-foreground border border-transparent"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Suspicious only
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {suspiciousCount}
          </span>
        </button>
      </div>
      <button onClick={() => navigate("/admin/shifts/new")} className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold">
        + Create New Shift
      </button>
      {shiftsLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
      ) : filtered.length > 0 ? (
        filtered.map(({ shift: s, suspicion }: any) => (
          <ShiftRow key={s.id} shift={s} suspicion={suspicion} />
        ))
      ) : (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">
          {suspiciousOnly ? "No suspicious shifts" : search ? "No shifts match your search" : "No shifts"}
        </p>
      )}
    </div>
  );
}

function ClientsTab({ clients, clientsLoading, navigate, onClientClick }: any) {
  return <ClientsTabImpl clients={clients} clientsLoading={clientsLoading} navigate={navigate} onClientClick={onClientClick} />;
}

function SuspiciousTab({ items, loading }: { items: { shift: any; suspicion: SuspicionResult }[]; loading: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span>
          {items.length} flagged shift{items.length === 1 ? "" : "s"} · sorted by severity, newest first
        </span>
      </div>
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
      ) : items.length > 0 ? (
        items.map(({ shift: s, suspicion }) => (
          <ShiftRow key={s.id} shift={s} suspicion={suspicion} />
        ))
      ) : (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">
          No suspicious shifts detected
        </p>
      )}
    </div>
  );
}

function ClientsTabImpl({ clients, clientsLoading, navigate, onClientClick }: any) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c: any) =>
      c.name?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.care_type?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name, address, care type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl text-sm"
        />
      </div>
      <button onClick={() => navigate("/admin/clients/new")} className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold">
        + Add New Client
      </button>
      {clientsLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
      ) : filtered.length > 0 ? (
        filtered.map((c: any) => (
          <div
            key={c.id}
            onClick={() => onClientClick(c)}
            className="bg-card rounded-2xl p-4 border border-border cursor-pointer hover:border-primary/30 transition-colors"
          >
            <h4 className="font-semibold text-card-foreground text-sm">{c.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{c.address}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{c.care_type}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">
          {search ? "No clients match your search" : "No clients"}
        </p>
      )}
    </div>
  );
}

function CaregiversTab({ caregivers, updateRole, navigate, onCaregiverClick }: any) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return caregivers;
    const q = search.toLowerCase();
    return caregivers.filter((cg: any) =>
      cg.full_name?.toLowerCase().includes(q) ||
      cg.phone?.toLowerCase().includes(q) ||
      cg.role?.toLowerCase().includes(q)
    );
  }, [caregivers, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search staff by name, phone, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl text-sm"
        />
      </div>
      <button onClick={() => navigate("/admin/caregivers/new")} className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold">
        + Add New Staff
      </button>
      {filtered.length > 0 ? (
        filtered.map((cg: any) => (
          <div key={cg.id} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors">
            <div onClick={() => onCaregiverClick(cg)}>
              <CaregiverAvatar caregiver={cg} />
            </div>
            <div className="flex-1 min-w-0" onClick={() => onCaregiverClick(cg)}>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-card-foreground text-sm">{cg.full_name || "Unnamed"}</h4>
                {cg.role && (
                  <Badge variant={cg.role === "admin" ? "destructive" : cg.role === "moderator" ? "default" : "secondary"} className="text-[10px]">
                    {cg.role}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{cg.phone || "No phone"}</p>
            </div>
            <Select
              value={cg.role || "user"}
              onValueChange={async (newRole) => {
                try {
                  await updateRole.mutateAsync({ targetUserId: cg.id, role: newRole });
                  toast.success(`Role updated to ${newRole}`);
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >
              <SelectTrigger className="w-[110px] h-8 text-xs shrink-0" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Caregiver</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">
          {search ? "No staff match your search" : "No caregivers"}
        </p>
      )}
    </div>
  );
}

export default AdminDashboard;
