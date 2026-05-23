import { useMemo, useState } from "react";
import { ArrowLeft, Download, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAllShifts, useAllCaregivers } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { differenceInMinutes } from "date-fns";
import { formatDate } from "@/lib/format";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function toInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

const AdminPayroll = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [from, setFrom] = useState<string>(toInput(startOfWeek(now)));
  const [to, setTo] = useState<string>(toInput(endOfWeek(now)));
  const { data: shifts = [] } = useAllShifts();
  const { data: caregivers = [] } = useAllCaregivers();

  const rows = useMemo(() => {
    const fromD = new Date(from + "T00:00:00").getTime();
    const toD = new Date(to + "T23:59:59").getTime();
    const byCg = new Map<string, { hours: number; shifts: number; pay: number }>();
    for (const s of shifts as any[]) {
      if (!s.caregiver_id || !s.clock_in_time || !s.clock_out_time) continue;
      const start = new Date(s.clock_in_time).getTime();
      if (start < fromD || start > toD) continue;
      const mins = differenceInMinutes(new Date(s.clock_out_time), new Date(s.clock_in_time));
      if (mins <= 0) continue;
      const hrs = mins / 60;
      const cur = byCg.get(s.caregiver_id) ?? { hours: 0, shifts: 0, pay: 0 };
      cur.hours += hrs;
      cur.shifts += 1;
      byCg.set(s.caregiver_id, cur);
    }
    return caregivers
      .map((c: any) => {
        const v = byCg.get(c.id);
        if (!v) return null;
        const rate = Number(c.pay_rate) || 0;
        v.pay = v.hours * rate;
        return { caregiver: c, ...v, rate };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.hours - a.hours);
  }, [shifts, caregivers, from, to]);

  const totals = rows.reduce(
    (acc: any, r: any) => ({ hours: acc.hours + r.hours, pay: acc.pay + r.pay, shifts: acc.shifts + r.shifts }),
    { hours: 0, pay: 0, shifts: 0 },
  );

  const exportCsv = () => {
    const header = ["Caregiver", "Employment", "Pay rate", "Tax form", "Direct deposit", "Shifts", "Hours", "Gross pay"];
    const lines = [header.join(",")];
    for (const r of rows as any[]) {
      const c = r.caregiver;
      lines.push([
        JSON.stringify(c.full_name || ""),
        c.employment_type || "",
        r.rate.toFixed(2),
        c.tax_form_status || "",
        c.direct_deposit_on_file ? "yes" : "no",
        r.shifts,
        r.hours.toFixed(2),
        r.pay.toFixed(2),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/admin")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h2 className="text-xl font-bold text-foreground mb-1">Payroll</h2>
        <p className="text-xs text-muted-foreground mb-4">Hours worked × pay rate, per caregiver, for the selected pay period.</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Period total</p>
            <p className="text-lg font-bold text-foreground">${totals.pay.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">{totals.hours.toFixed(1)} hrs · {totals.shifts} shifts</p>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold">
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>

        <div className="space-y-2">
          {rows.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 border border-border text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No completed shifts in this period.</p>
            </div>
          ) : (
            rows.map((r: any) => (
              <div key={r.caregiver.id} className="bg-card rounded-2xl p-3 border border-border">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{r.caregiver.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.caregiver.employment_type || "—"} · {r.caregiver.tax_form_status || "no tax form"}
                      {!r.caregiver.direct_deposit_on_file && <span className="text-warning"> · no direct deposit</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">${r.pay.toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">{r.hours.toFixed(1)} hrs @ ${r.rate.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Period: {formatDate(from)} – {formatDate(to)}
        </p>
      </div>
    </MobileLayout>
  );
};

export default AdminPayroll;