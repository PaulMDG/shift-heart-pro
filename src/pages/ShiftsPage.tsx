import MobileLayout from "@/components/layout/MobileLayout";
import ShiftCard from "@/components/shifts/ShiftCard";
import { useShifts } from "@/hooks/useShifts";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const tabs = ["All", "Today", "Upcoming", "Completed"] as const;

const ShiftsPage = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("All");
  const { data: shifts = [], isLoading } = useShifts();

  const today = new Date().toISOString().split("T")[0];
  const filteredShifts = shifts.filter((s) => {
    if (activeTab === "Today") return s.date === today;
    if (activeTab === "Upcoming") return s.date > today;
    if (activeTab === "Completed") return s.status === "completed";
    return true;
  });

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-4">
        <h2 className="text-xl font-bold text-foreground">My Shifts</h2>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

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
      </div>
    </MobileLayout>
  );
};

export default ShiftsPage;
