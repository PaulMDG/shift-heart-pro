import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { useShifts, type ShiftWithClient } from "@/hooks/useShifts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ChevronRight, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { formatTime } from "@/lib/format";

const DEFAULT_TASKS = [
  "Personal hygiene assistance",
  "Meal preparation",
  "Medication reminder",
  "Light housekeeping",
  "Mobility assistance",
  "Vitals check",
];

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

  const [checks, setChecks] = useState<Record<string, string[]>>({});

  const toggle = (shiftId: string, task: string) => {
    setChecks((prev) => {
      const current = prev[shiftId] ?? [];
      return {
        ...prev,
        [shiftId]: current.includes(task)
          ? current.filter((t) => t !== task)
          : [...current, task],
      };
    });
  };

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-24 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs uppercase tracking-[0.18em] font-semibold">Today</span>
          </div>
          <h1 className="font-display text-3xl text-foreground">Care Tasks</h1>
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
              const completed = checks[shift.id] ?? [];
              const pct = Math.round((completed.length / DEFAULT_TASKS.length) * 100);
              return (
                <Card key={shift.id} className="overflow-hidden">
                  <button
                    onClick={() => navigate(`/shifts/${shift.id}`)}
                    className="w-full text-left px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-border/50"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-display text-lg truncate">{shift.client.name}</p>
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
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {pct}%
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>

                  <ul className="px-4 py-3 space-y-2">
                    {DEFAULT_TASKS.map((task) => {
                      const checked = completed.includes(task);
                      return (
                        <li key={task} className="flex items-center gap-3">
                          <Checkbox
                            id={`${shift.id}-${task}`}
                            checked={checked}
                            onCheckedChange={() => toggle(shift.id, task)}
                          />
                          <label
                            htmlFor={`${shift.id}-${task}`}
                            className={`text-sm flex-1 cursor-pointer ${
                              checked ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {task}
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="px-4 pb-4">
                    <button
                      onClick={() => navigate(`/shifts/${shift.id}/care-notes`)}
                      className="w-full text-sm font-medium text-primary border border-primary/40 rounded-md py-2 hover:bg-primary/10 transition"
                    >
                      Open care notes
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