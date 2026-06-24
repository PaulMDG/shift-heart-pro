import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { useShifts, type ShiftWithClient } from "@/hooks/useShifts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ClipboardList, ChevronRight, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { formatTime } from "@/lib/format";
import ShiftTasksList from "@/components/shifts/ShiftTasksList";

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

const TasksPage = () => {
  const navigate = useNavigate();
  const { data: shifts = [], isLoading } = useShifts();

  const todayShifts = useMemo(
    () =>
      (shifts as ShiftWithClient[]).filter(
        (s) => s.date === todayIso() && s.status !== "cancelled",
      ),
    [shifts],
  );

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-24 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs uppercase tracking-[0.18em] font-semibold">Today</span>
          </div>
          <h1 className="font-display text-3xl text-canvas-foreground">Care Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Track care tasks for each of today's visits. Final task completion is captured
            on clock-out.
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : todayShifts.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-success" />
            <p className="font-display text-xl">No visits scheduled today</p>
            <p className="text-sm text-muted-foreground">
              Check your full schedule for upcoming shifts.
            </p>
            <button
              onClick={() => navigate("/shifts")}
              className="text-sm text-primary font-medium underline-offset-4 hover:underline"
            >
              View schedule
            </button>
          </Card>
        ) : (
          <div className="space-y-4">
            {todayShifts.map((shift) => {
              return (
                <Card key={shift.id} className="overflow-hidden bg-surface text-surface-foreground border-[hsl(var(--ivory-border))] shadow-soft">
                  <button
                    onClick={() => navigate(`/shifts/${shift.id}`)}
                    className="w-full text-left px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-[hsl(var(--ivory-border))]"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-display text-lg truncate text-surface-foreground">{shift.client.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                        </span>
                        {shift.client.address && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{shift.client.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>

                  <div className="px-4 py-3">
                    <ShiftTasksList shiftId={shift.id} autoSeed />
                  </div>

                  <div className="px-4 pb-4">
                    <button
                      onClick={() => navigate(`/shifts/${shift.id}/care-notes`)}
                      className="w-full text-sm font-semibold tracking-wide text-primary border border-primary/40 rounded-lg py-2.5 hover:bg-primary/10 transition uppercase"
                    >
                      Visit Documentation
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default TasksPage;