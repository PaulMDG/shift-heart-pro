import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useShifts } from "@/hooks/useShifts";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import { format, parseISO, differenceInMinutes } from "date-fns";

const ProfileTimesheets = () => {
  const navigate = useNavigate();
  const { data: shifts, isLoading } = useShifts();

  const completed = shifts?.filter((s) => s.status === "completed" && s.clock_in_time && s.clock_out_time) ?? [];

  const totalMinutes = completed.reduce((sum, s) => {
    if (!s.clock_in_time || !s.clock_out_time) return sum;
    return sum + differenceInMinutes(new Date(s.clock_out_time), new Date(s.clock_in_time));
  }, 0);

  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/profile")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Profile
        </button>
        <h2 className="text-xl font-bold text-foreground mb-2">Timesheets</h2>
        <p className="text-sm text-muted-foreground mb-6">Total hours worked: <span className="font-bold text-foreground">{totalHours}h</span></p>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : completed.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No completed shifts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((s) => {
              const mins = differenceInMinutes(new Date(s.clock_out_time!), new Date(s.clock_in_time!));
              const hrs = (mins / 60).toFixed(1);
              return (
                <div key={s.id} className="bg-card rounded-2xl p-4 shadow-card">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-card-foreground">{s.client.name}</p>
                    <span className="text-xs font-bold text-primary">{hrs}h</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(parseISO(s.date), "MMM d, yyyy")}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(s.clock_in_time!), "h:mm a")} – {format(new Date(s.clock_out_time!), "h:mm a")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ProfileTimesheets;
