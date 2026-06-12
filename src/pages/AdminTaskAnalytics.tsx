import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Loader2, Users, Tag } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAllShifts, useAllCaregivers, useAllClients } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";

interface TaskRow {
  id: string;
  shift_id: string;
  completed: boolean;
}

function useAllShiftTasks() {
  return useQuery({
    queryKey: ["admin-all-shift-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_tasks")
        .select("id, shift_id, completed");
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });
}

interface AggRow {
  key: string;
  label: string;
  total: number;
  completed: number;
  shifts: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent>
  </Card>
);

const RateRow = ({ row }: { row: AggRow }) => {
  const pct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium truncate">{row.label}</span>
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
          {row.completed}/{row.total} · {pct}%
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <div className="text-[11px] text-muted-foreground">
        {row.shifts} shift{row.shifts === 1 ? "" : "s"} with tasks
      </div>
    </div>
  );
};

const AdminTaskAnalytics = () => {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading: tasksLoading } = useAllShiftTasks();
  const { data: shifts = [], isLoading: shiftsLoading } = useAllShifts();
  const { data: caregivers = [] } = useAllCaregivers();
  const { data: clients = [] } = useAllClients();

  const loading = tasksLoading || shiftsLoading;

  const { byCaregiver, byCareType, overall } = useMemo(() => {
    const shiftMap = new Map<string, any>();
    for (const s of shifts as any[]) shiftMap.set(s.id, s);
    const clientMap = new Map<string, any>();
    for (const c of clients as any[]) clientMap.set(c.id, c);
    const cgMap = new Map<string, any>();
    for (const c of caregivers as any[]) cgMap.set(c.id, c);

    const cgAgg = new Map<string, AggRow & { shiftSet: Set<string> }>();
    const ctAgg = new Map<string, AggRow & { shiftSet: Set<string> }>();

    let total = 0;
    let completed = 0;

    for (const t of tasks) {
      total += 1;
      if (t.completed) completed += 1;

      const shift = shiftMap.get(t.shift_id);
      if (!shift) continue;

      // By caregiver
      const cgId: string | null = shift.caregiver_id ?? null;
      if (cgId) {
        const cg = cgMap.get(cgId);
        const key = cgId;
        const label = cg?.full_name || "Unknown caregiver";
        const row =
          cgAgg.get(key) ??
          ({ key, label, total: 0, completed: 0, shifts: 0, shiftSet: new Set() } as any);
        row.total += 1;
        if (t.completed) row.completed += 1;
        row.shiftSet.add(shift.id);
        row.shifts = row.shiftSet.size;
        cgAgg.set(key, row);
      }

      // By care type
      const client = shift.client_id ? clientMap.get(shift.client_id) : null;
      const ct: string = client?.care_type || "(uncategorized)";
      const row =
        ctAgg.get(ct) ??
        ({ key: ct, label: ct, total: 0, completed: 0, shifts: 0, shiftSet: new Set() } as any);
      row.total += 1;
      if (t.completed) row.completed += 1;
      row.shiftSet.add(shift.id);
      row.shifts = row.shiftSet.size;
      ctAgg.set(ct, row);
    }

    const sortByRate = (a: AggRow, b: AggRow) => {
      const ra = a.total > 0 ? a.completed / a.total : 0;
      const rb = b.total > 0 ? b.completed / b.total : 0;
      if (rb !== ra) return rb - ra;
      return b.total - a.total;
    };

    return {
      byCaregiver: Array.from(cgAgg.values()).sort(sortByRate),
      byCareType: Array.from(ctAgg.values()).sort(sortByRate),
      overall: { total, completed },
    };
  }, [tasks, shifts, clients, caregivers]);

  const overallPct =
    overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0;

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/settings")}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Task Analytics</h2>
            <p className="text-xs text-muted-foreground">
              Completion rates across all shift tasks.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={BarChart3}
                label="Overall"
                value={`${overallPct}%`}
                sub={`${overall.completed}/${overall.total}`}
              />
              <StatCard
                icon={Users}
                label="Caregivers"
                value={String(byCaregiver.length)}
                sub="with tasks"
              />
              <StatCard
                icon={Tag}
                label="Care types"
                value={String(byCareType.length)}
                sub="with tasks"
              />
            </div>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4" /> By care type
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                {byCareType.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tasks yet.</p>
                ) : (
                  byCareType.map((r) => <RateRow key={r.key} row={r} />)
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" /> By caregiver
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                {byCaregiver.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No caregiver-assigned task data yet.
                  </p>
                ) : (
                  byCaregiver.map((r) => <RateRow key={r.key} row={r} />)
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default AdminTaskAnalytics;