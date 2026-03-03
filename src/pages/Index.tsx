import MobileLayout from "@/components/layout/MobileLayout";
import ShiftCard from "@/components/shifts/ShiftCard";
import { shifts } from "@/data/mockData";
import { CalendarDays, Clock, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const today = "2026-03-02";
  const todayShifts = shifts.filter((s) => s.date === today);
  const upcomingShifts = shifts.filter((s) => s.date > today);

  const stats = [
    { icon: CalendarDays, label: "Today", value: todayShifts.length, color: "text-primary" },
    { icon: Clock, label: "This week", value: "24h", color: "text-info" },
    { icon: TrendingUp, label: "Done", value: "12", color: "text-success" },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Good morning, Sarah 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You have {todayShifts.length} shift{todayShifts.length !== 1 ? "s" : ""} today
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-3.5 border border-border text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
              <p className="text-lg font-bold text-card-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">Today's Shifts</h3>
            <span className="text-xs text-muted-foreground">March 2, 2026</span>
          </div>
          <div className="space-y-3">
            {todayShifts.length > 0 ? (
              todayShifts.map((shift) => <ShiftCard key={shift.id} shift={shift} />)
            ) : (
              <div className="bg-card rounded-2xl p-8 border border-border text-center">
                <p className="text-sm text-muted-foreground">No shifts today</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-foreground mb-3">Upcoming</h3>
          <div className="space-y-3">
            {upcomingShifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
