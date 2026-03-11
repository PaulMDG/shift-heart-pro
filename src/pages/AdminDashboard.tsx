import { useState } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAllShifts, useAllClients, useAllCaregivers, useAllSwapRequests, useAdminApproveSwap, useAdminDeclineSwap, useUpdateUserRole } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Users, UserCheck, ArrowRightLeft, Clock, CheckCircle2, AlertTriangle, Loader2, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

import { DollarSign, FileText } from "lucide-react";

const tabs = ["Overview", "Swaps", "Shifts", "Clients", "Caregivers"] as const;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Overview");
  const { data: shifts = [], isLoading: shiftsLoading } = useAllShifts();
  const { data: clients = [], isLoading: clientsLoading } = useAllClients();
  const { data: caregivers = [] } = useAllCaregivers();
  const { data: swapRequests = [] } = useAllSwapRequests();
  const approveSwap = useAdminApproveSwap();
  const declineSwap = useAdminDeclineSwap();
  const updateRole = useUpdateUserRole();
  const navigate = useNavigate();

  // Real-time auto-refresh
  useRealtimeSync([]);

  const pendingSwaps = swapRequests.filter((r: any) => r.status === "pending");
  const today = new Date().toISOString().split("T")[0];
  const todayShifts = shifts.filter((s) => s.date === today);
  const activeShifts = shifts.filter((s) => s.status === "in_progress");
  const completedShifts = shifts.filter((s) => s.status === "completed");

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
    { icon: CalendarDays, label: "Today", value: todayShifts.length, color: "text-primary" },
    { icon: Clock, label: "Active", value: activeShifts.length, color: "text-info" },
    { icon: CheckCircle2, label: "Done", value: completedShifts.length, color: "text-success" },
    { icon: ArrowRightLeft, label: "Swaps", value: pendingSwaps.length, color: "text-warning" },
    { icon: Users, label: "Clients", value: clients.length, color: "text-accent-foreground" },
    { icon: UserCheck, label: "Staff", value: caregivers.length, color: "text-primary" },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Admin Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage shifts, clients & staff</p>
          </div>
          <button
            onClick={() => navigate("/admin/billing")}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
          >
            <DollarSign className="w-4 h-4 text-accent-foreground" />
          </button>
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
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-card rounded-2xl p-3 border border-border text-center">
                  <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                  <p className="text-lg font-bold text-card-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                </div>
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
                    <SwapRow key={req.id} req={req} onApprove={handleApprove} onDecline={handleDecline} loading={approveSwap.isPending || declineSwap.isPending} />
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
                  {todayShifts.map((s) => (
                    <ShiftRow key={s.id} shift={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-card rounded-2xl p-6 text-center border border-border">No shifts scheduled today</p>
              )}
            </section>
          </div>
        )}

        {activeTab === "Swaps" && (
          <div className="space-y-3">
            {swapRequests.length > 0 ? (
              swapRequests.map((req: any) => (
                <SwapRow key={req.id} req={req} onApprove={handleApprove} onDecline={handleDecline} loading={approveSwap.isPending || declineSwap.isPending} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">No swap requests</p>
            )}
          </div>
        )}

        {activeTab === "Shifts" && (
          <div className="space-y-3">
            <button onClick={() => navigate("/admin/shifts/new")} className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold">
              + Create New Shift
            </button>
            {shiftsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
            ) : shifts.length > 0 ? (
              shifts.map((s) => <ShiftRow key={s.id} shift={s} />)
            ) : (
              <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">No shifts</p>
            )}
          </div>
        )}

        {activeTab === "Clients" && (
          <div className="space-y-3">
            <button onClick={() => navigate("/admin/clients/new")} className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold">
              + Add New Client
            </button>
            {clientsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
            ) : clients.length > 0 ? (
              clients.map((c: any) => (
                <div key={c.id} className="bg-card rounded-2xl p-4 border border-border">
                  <h4 className="font-semibold text-card-foreground text-sm">{c.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.address}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{c.care_type}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">No clients</p>
            )}
          </div>
        )}

        {activeTab === "Caregivers" && (
          <div className="space-y-3">
            <button onClick={() => navigate("/admin/caregivers/new")} className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold">
              + Add New Staff
            </button>
            {caregivers.length > 0 ? (
              caregivers.map((cg: any) => (
                <div key={cg.id} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">
                      {(cg.full_name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
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
                    <SelectTrigger className="w-[110px] h-8 text-xs shrink-0">
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
              <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center border border-border">No caregivers</p>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

// Sub-components

const statusStyles: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-primary/15 text-primary" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  missed: { label: "Missed", className: "bg-destructive/15 text-destructive" },
};

function ShiftRow({ shift }: { shift: any }) {
  const navigate = useNavigate();
  const st = statusStyles[shift.status] ?? statusStyles.not_started;
  return (
    <div
      onClick={() => navigate(`/admin/shifts/${shift.id}`)}
      className="bg-card rounded-2xl p-4 border border-border cursor-pointer hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-card-foreground text-sm">{shift.client?.name}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{shift.date} · {shift.start_time} – {shift.end_time}</p>
      {shift.caregiver && (
        <p className="text-xs text-muted-foreground mt-1">👤 {shift.caregiver.full_name}</p>
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

export default AdminDashboard;
