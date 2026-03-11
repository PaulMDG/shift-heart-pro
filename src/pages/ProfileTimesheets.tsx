import { ArrowLeft, Clock, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useShifts } from "@/hooks/useShifts";
import { useBillingRates, getApplicableRate } from "@/hooks/useBillingRates";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import { format, parseISO, differenceInMinutes } from "date-fns";

const ProfileTimesheets = () => {
  const navigate = useNavigate();
  const { data: shifts, isLoading } = useShifts();
  const { data: rates = [] } = useBillingRates();

  const completed = shifts?.filter((s) => s.status === "completed" && s.clock_in_time && s.clock_out_time) ?? [];

  const totalMinutes = completed.reduce((sum, s) => {
    if (!s.clock_in_time || !s.clock_out_time) return sum;
    return sum + differenceInMinutes(new Date(s.clock_out_time), new Date(s.clock_in_time));
  }, 0);

  const totalHours = (totalMinutes / 60).toFixed(1);

  const totalEarnings = completed.reduce((sum, s) => {
    if (!s.clock_in_time || !s.clock_out_time) return sum;
    const mins = differenceInMinutes(new Date(s.clock_out_time), new Date(s.clock_in_time));
    const rate = getApplicableRate(rates, s.client_id, s.date);
    return sum + (mins / 60) * rate;
  }, 0);

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/profile")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Profile
        </button>
        <h2 className="text-xl font-bold text-foreground mb-2">Timesheets & Invoices</h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-2xl p-4 shadow-card text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-card-foreground">{totalHours}h</p>
            <p className="text-[10px] text-muted-foreground">Total Hours</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-card text-center">
            <DollarSign className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-card-foreground">${totalEarnings.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Total Earned</p>
          </div>
        </div>

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
              const rate = getApplicableRate(rates, s.client_id, s.date);
              const earned = ((mins / 60) * rate).toFixed(2);
              return (
                <div key={s.id} className="bg-card rounded-2xl p-4 shadow-card">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-card-foreground">{s.client.name}</p>
                    <span className="text-xs font-bold text-success">${earned}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(parseISO(s.date), "MMM d, yyyy")}</span>
                    <span>•</span>
                    <span>{hrs}h @ ${rate}/hr</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
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
