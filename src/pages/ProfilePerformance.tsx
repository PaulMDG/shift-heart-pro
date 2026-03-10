import { ArrowLeft, Star, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useShifts } from "@/hooks/useShifts";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";

const ProfilePerformance = () => {
  const navigate = useNavigate();
  const { data: shifts, isLoading } = useShifts();

  const all = shifts ?? [];
  const completed = all.filter((s) => s.status === "completed");
  const totalShifts = completed.length;

  // On-time = clocked in within 15 min of start_time
  const onTimeCount = completed.filter((s) => {
    if (!s.clock_in_time) return false;
    const scheduled = new Date(`${s.date}T${s.start_time}`);
    const actual = new Date(s.clock_in_time);
    const diffMin = (actual.getTime() - scheduled.getTime()) / 60000;
    return diffMin <= 15;
  }).length;

  const onTimePercent = totalShifts > 0 ? Math.round((onTimeCount / totalShifts) * 100) : 0;

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/profile")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Profile
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6">Performance</h2>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-5 shadow-card text-center">
              <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold text-card-foreground">{totalShifts}</p>
              <p className="text-xs text-muted-foreground">Shifts Completed</p>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-card text-center">
              <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold text-card-foreground">{onTimePercent}%</p>
              <p className="text-xs text-muted-foreground">On-Time Rate</p>
              <p className="text-[10px] text-muted-foreground mt-1">{onTimeCount} of {totalShifts} shifts clocked in within 15 min</p>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-card text-center">
              <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-card-foreground">—</p>
              <p className="text-xs text-muted-foreground">Average Rating</p>
              <p className="text-[10px] text-muted-foreground mt-1">Ratings coming soon</p>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ProfilePerformance;
