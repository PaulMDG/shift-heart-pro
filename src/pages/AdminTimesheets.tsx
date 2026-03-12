import { useState } from "react";
import { ArrowLeft, Check, X, Clock, Loader2, CheckCheck, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAllShifts } from "@/hooks/useAdmin";
import { useBillingRates, getApplicableRate } from "@/hooks/useBillingRates";
import { useTimesheetApproval } from "@/hooks/useTimesheetApproval";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import MobileLayout from "@/components/layout/MobileLayout";
import { format, differenceInMinutes } from "date-fns";
import { toast } from "@/components/ui/sonner";

const filters = ["pending", "approved", "rejected"] as const;

const AdminTimesheets = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<typeof filters[number]>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: shifts = [], isLoading } = useAllShifts();
  const { data: rates = [] } = useBillingRates();
  const approve = useTimesheetApproval();
  const [bulkLoading, setBulkLoading] = useState(false);

  const completed = shifts.filter(
    (s) => s.status === "completed" && s.clock_in_time && s.clock_out_time && (s as any).timesheet_status === filter
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === completed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(completed.map((s) => s.id)));
    }
  };

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try {
      await approve.mutateAsync({ id, timesheet_status: status });
      toast.success(`Timesheet ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkAction = async (status: "approved" | "rejected") => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) => approve.mutateAsync({ id, timesheet_status: status }))
      );
      toast.success(`${selected.size} timesheet(s) ${status}`);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/admin")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h2 className="text-xl font-bold text-foreground mb-4">Timesheet Approvals</h2>

        <div className="flex gap-2 mb-5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelected(new Set()); }}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-colors ${
                filter === f ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Bulk actions bar */}
        {filter === "pending" && completed.length > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-muted/50 rounded-xl px-3 py-2">
            <Checkbox
              checked={selected.size === completed.length && completed.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-xs text-muted-foreground flex-1">
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </span>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction("approved")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                  Approve All
                </button>
                <button
                  onClick={() => handleBulkAction("rejected")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" /> Reject All
                </button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : completed.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No {filter} timesheets</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((s) => {
              const mins = differenceInMinutes(new Date(s.clock_out_time!), new Date(s.clock_in_time!));
              const hrs = (mins / 60).toFixed(1);
              const rate = getApplicableRate(rates, s.client_id, s.date);
              const earned = ((mins / 60) * rate).toFixed(2);
              return (
                <div key={s.id} className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex items-center gap-3 mb-1">
                    {filter === "pending" && (
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={() => toggleSelect(s.id)}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">{s.client?.name}</p>
                          <p className="text-xs text-muted-foreground">{s.caregiver?.full_name || "Unassigned"}</p>
                        </div>
                        <span className="text-xs font-bold text-success">${earned}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {s.date} · {hrs}h @ ${rate}/hr
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {format(new Date(s.clock_in_time!), "h:mm a")} – {format(new Date(s.clock_out_time!), "h:mm a")}
                  </p>
                  {filter === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(s.id, "approved")}
                        disabled={approve.isPending}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                      >
                        {approve.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(s.id, "rejected")}
                        disabled={approve.isPending}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-border text-xs font-semibold text-foreground disabled:opacity-50"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default AdminTimesheets;
