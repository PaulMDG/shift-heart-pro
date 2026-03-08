import MobileLayout from "@/components/layout/MobileLayout";
import ShiftCard from "@/components/shifts/ShiftCard";
import SwapRequestCard from "@/components/shifts/SwapRequestCard";
import { useShifts } from "@/hooks/useShifts";
import {
  useMySwapRequests,
  useIncomingSwapRequests,
  useAcceptSwapRequest,
  useDeclineSwapRequest,
  useCancelSwapRequest,
} from "@/hooks/useSwapRequests";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

const tabs = ["All", "Today", "Upcoming", "Completed", "Swaps"] as const;

const ShiftsPage = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("All");
  const { data: shifts = [], isLoading } = useShifts();
  const { data: mySwaps = [], isLoading: swapsLoading } = useMySwapRequests();
  const { data: incomingSwaps = [] } = useIncomingSwapRequests();
  const acceptSwap = useAcceptSwapRequest();
  const declineSwap = useDeclineSwapRequest();
  const cancelSwap = useCancelSwapRequest();

  const today = new Date().toISOString().split("T")[0];
  const filteredShifts = shifts.filter((s) => {
    if (activeTab === "Today") return s.date === today;
    if (activeTab === "Upcoming") return s.date > today;
    if (activeTab === "Completed") return s.status === "completed";
    return true;
  });

  const handleAccept = async (id: string) => {
    try {
      await acceptSwap.mutateAsync(id);
      toast.success("Swap accepted! The shift has been reassigned to you.");
    } catch (e: any) {
      toast.error(e.message || "Failed to accept swap");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await declineSwap.mutateAsync(id);
      toast.success("Swap request declined.");
    } catch (e: any) {
      toast.error(e.message || "Failed to decline swap");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSwap.mutateAsync(id);
      toast.success("Swap request cancelled.");
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel swap");
    }
  };

  const isSwapsTab = activeTab === "Swaps";

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-4">
        <h2 className="text-xl font-bold text-foreground">My Shifts</h2>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === tab
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab}
              {tab === "Swaps" && incomingSwaps.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {incomingSwaps.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {isSwapsTab ? (
          <div className="space-y-5">
            {incomingSwaps.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Incoming Requests</h3>
                <div className="space-y-3">
                  {incomingSwaps.map((req) => (
                    <SwapRequestCard
                      key={req.id}
                      request={req}
                      variant="incoming"
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      isLoading={acceptSwap.isPending || declineSwap.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">My Requests</h3>
              <div className="space-y-3">
                {swapsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
                ) : mySwaps.length > 0 ? (
                  mySwaps.map((req) => (
                    <SwapRequestCard
                      key={req.id}
                      request={req}
                      variant="outgoing"
                      onCancel={handleCancel}
                      isLoading={cancelSwap.isPending}
                    />
                  ))
                ) : (
                  <div className="bg-card rounded-2xl p-8 border border-border text-center">
                    <p className="text-sm text-muted-foreground">No swap requests yet</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
            ) : filteredShifts.length > 0 ? (
              filteredShifts.map((shift) => <ShiftCard key={shift.id} shift={shift} />)
            ) : (
              <div className="bg-card rounded-2xl p-8 shadow-card text-center">
                <p className="text-sm text-muted-foreground">No shifts found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ShiftsPage;
