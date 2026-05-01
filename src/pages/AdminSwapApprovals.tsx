import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, Check, X, Loader2 } from "lucide-react";
import { useAllSwapRequests, useAdminApproveSwap, useAdminDeclineSwap } from "@/hooks/useAdmin";
import { sendNotificationEmail, emailTemplate } from "@/lib/notifyEmail";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const AdminSwapApprovals = () => {
  const navigate = useNavigate();
  const { data: swaps, isLoading } = useAllSwapRequests();
  const approveSwap = useAdminApproveSwap();
  const declineSwap = useAdminDeclineSwap();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const filtered = (swaps || []).filter((s: any) => filter === "all" || s.status === "pending");

  const handleApprove = async (swap: any) => {
    setActioningId(swap.id);
    try {
      await approveSwap.mutateAsync(swap.id);
      toast.success("Swap approved");
      // Notify requester
      sendNotificationEmail({
        to: [],
        caregiver_id: swap.requester_id,
        subject: `Swap approved — ${swap.shift?.date ?? ""}`,
        html: emailTemplate(
          "Your swap request was approved",
          `<p>Your swap request for the shift on <strong>${swap.shift?.date}</strong> (${swap.shift?.start_time} – ${swap.shift?.end_time}) with <strong>${swap.shift?.client?.name ?? "a client"}</strong> has been <strong>approved</strong> by an admin.</p>`
        ),
      });
      // Notify target if exists
      if (swap.target_id) {
        sendNotificationEmail({
          to: [],
          caregiver_id: swap.target_id,
          subject: `Shift swap accepted — ${swap.shift?.date ?? ""}`,
          html: emailTemplate(
            "A shift has been swapped to you",
            `<p>You've been assigned a shift on <strong>${swap.shift?.date}</strong> (${swap.shift?.start_time} – ${swap.shift?.end_time}) with <strong>${swap.shift?.client?.name ?? "a client"}</strong> via an approved swap.</p>`
          ),
        });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (swap: any) => {
    setActioningId(swap.id);
    try {
      await declineSwap.mutateAsync(swap.id);
      toast.success("Swap declined");
      sendNotificationEmail({
        to: [],
        caregiver_id: swap.requester_id,
        subject: `Swap declined — ${swap.shift?.date ?? ""}`,
        html: emailTemplate(
          "Your swap request was declined",
          `<p>Your swap request for the shift on <strong>${swap.shift?.date}</strong> has been <strong>declined</strong> by an admin.</p>`
        ),
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-lg font-bold text-foreground">Swap Approvals</span>
      </div>

      <div className="px-5 py-4 flex gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === "pending" ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === "all" ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          All
        </button>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ArrowRightLeft className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No {filter === "pending" ? "pending " : ""}swap requests</p>
          </div>
        ) : (
          filtered.map((swap: any) => (
            <div key={swap.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-card-foreground">{swap.shift?.client?.name ?? "Unknown Client"}</p>
                  <p className="text-xs text-muted-foreground">{swap.shift?.date} · {swap.shift?.start_time} – {swap.shift?.end_time}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor[swap.status] || "bg-muted text-muted-foreground"}`}>
                  {swap.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Requester:</strong> {swap.requester?.full_name ?? "Unknown"}</p>
                {swap.target && <p><strong>Target:</strong> {swap.target.full_name}</p>}
              </div>
              {swap.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleApprove(swap)}
                    disabled={actioningId === swap.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {actioningId === swap.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecline(swap)}
                    disabled={actioningId === swap.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-destructive text-destructive text-sm font-bold disabled:opacity-50"
                  >
                    {actioningId === swap.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminSwapApprovals;