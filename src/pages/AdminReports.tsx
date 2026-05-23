import { useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAllShifts, useAllCaregivers, useAllClients } from "@/hooks/useAdmin";
import { useAllCaregiverDocuments, useAllClientDocuments } from "@/hooks/useComplianceDocuments";
import { evaluateCaregiverCompleteness, evaluateClientCompleteness, CAREGIVER_DOC_LABELS, CLIENT_DOC_LABELS } from "@/lib/profileCompleteness";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { differenceInMinutes } from "date-fns";
import { formatDate } from "@/lib/format";

function daysFromNow(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const AdminReports = () => {
  const navigate = useNavigate();
  const now = new Date();
  const defaultFrom = new Date(now); defaultFrom.setDate(now.getDate() - 30);
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const { data: shifts = [] } = useAllShifts();
  const { data: caregivers = [] } = useAllCaregivers();
  const { data: clients = [] } = useAllClients();
  const { data: cgDocs } = useAllCaregiverDocuments();
  const { data: clDocs } = useAllClientDocuments();

  // ---- Compliance overview ----
  const compliance = useMemo(() => {
    const cgCounts = { green: 0, yellow: 0, red: 0 };
    const clCounts = { green: 0, yellow: 0, red: 0 };
    for (const c of caregivers as any[]) {
      const r = evaluateCaregiverCompleteness(c, (cgDocs?.get(c.id) ?? []) as any);
      cgCounts[r.status]++;
    }
    for (const c of clients as any[]) {
      const r = evaluateClientCompleteness(c, (clDocs?.get(c.id) ?? []) as any);
      clCounts[r.status]++;
    }

    const expiring: { who: string; doc: string; days: number; expiry: string }[] = [];
    const collect = (docsMap: Map<string, any[]> | undefined, nameMap: Map<string, string>, labels: Record<string, string>) => {
      if (!docsMap) return;
      for (const [id, docs] of docsMap.entries()) {
        for (const d of docs) {
          if (!d.expiry_date) continue;
          const days = daysFromNow(d.expiry_date);
          if (days >= 0 && days <= 90) {
            expiring.push({
              who: nameMap.get(id) || "—",
              doc: labels[d.doc_type] ?? d.doc_type,
              days,
              expiry: d.expiry_date,
            });
          }
        }
      }
    };
    collect(cgDocs, new Map(caregivers.map((c: any) => [c.id, c.full_name])), CAREGIVER_DOC_LABELS);
    collect(clDocs, new Map(clients.map((c: any) => [c.id, c.name])), CLIENT_DOC_LABELS);
    expiring.sort((a, b) => a.days - b.days);

    return { cgCounts, clCounts, expiring };
  }, [caregivers, clients, cgDocs, clDocs]);

  // ---- Hours / payroll & performance (filtered by date range) ----
  const perCg = useMemo(() => {
    const fromD = new Date(from + "T00:00:00").getTime();
    const toD = new Date(to + "T23:59:59").getTime();
    const m = new Map<string, { hours: number; pay: number; shifts: number; onTime: number; late: number; missed: number; gpsOk: number }>();
    for (const s of shifts as any[]) {
      if (!s.caregiver_id) continue;
      const sd = new Date(s.date + "T00:00:00").getTime();
      if (sd < fromD || sd > toD) continue;
      const cg = caregivers.find((c: any) => c.id === s.caregiver_id);
      const cur = m.get(s.caregiver_id) ?? { hours: 0, pay: 0, shifts: 0, onTime: 0, late: 0, missed: 0, gpsOk: 0 };
      cur.shifts += 1;
      if (s.status === "missed") cur.missed += 1;
      if (s.clock_in_time && s.clock_out_time) {
        const mins = differenceInMinutes(new Date(s.clock_out_time), new Date(s.clock_in_time));
        if (mins > 0) {
          cur.hours += mins / 60;
          cur.pay += (mins / 60) * (Number(cg?.pay_rate) || 0);
        }
      }
      if (s.clock_in_time && s.start_time) {
        const [h, mn] = s.start_time.split(":").map(Number);
        const scheduled = new Date(s.date + "T00:00:00");
        scheduled.setHours(h || 0, mn || 0);
        const delta = differenceInMinutes(new Date(s.clock_in_time), scheduled);
        if (delta <= 15) cur.onTime += 1; else cur.late += 1;
      }
      if (s.clock_in_lat != null && s.clock_in_lng != null) cur.gpsOk += 1;
      m.set(s.caregiver_id, cur);
    }
    return caregivers
      .map((c: any) => ({ caregiver: c, ...(m.get(c.id) ?? { hours: 0, pay: 0, shifts: 0, onTime: 0, late: 0, missed: 0, gpsOk: 0 }) }))
      .filter((r: any) => r.shifts > 0)
      .sort((a: any, b: any) => b.hours - a.hours);
  }, [shifts, caregivers, from, to]);

  const totals = perCg.reduce(
    (acc: any, r: any) => ({
      hours: acc.hours + r.hours,
      pay: acc.pay + r.pay,
      shifts: acc.shifts + r.shifts,
      onTime: acc.onTime + r.onTime,
      late: acc.late + r.late,
      missed: acc.missed + r.missed,
      gpsOk: acc.gpsOk + r.gpsOk,
    }),
    { hours: 0, pay: 0, shifts: 0, onTime: 0, late: 0, missed: 0, gpsOk: 0 },
  );
  const onTimePct = totals.onTime + totals.late > 0
    ? Math.round((totals.onTime / (totals.onTime + totals.late)) * 100) : 0;
  const gpsPct = totals.shifts > 0 ? Math.round((totals.gpsOk / totals.shifts) * 100) : 0;

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/admin")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h2 className="text-xl font-bold text-foreground mb-1">Reports</h2>
        <p className="text-xs text-muted-foreground mb-4">Compliance, payroll, and shift performance at a glance.</p>

        {/* Compliance */}
        <Section icon={ShieldCheck} title="Compliance overview">
          <div className="grid grid-cols-2 gap-3">
            <StatusCard title="Caregivers" counts={compliance.cgCounts} />
            <StatusCard title="Clients" counts={compliance.clCounts} />
          </div>
          <div className="mt-3 bg-card rounded-2xl border border-border p-3">
            <p className="text-xs font-semibold mb-2 text-foreground">Documents expiring (next 90 days)</p>
            {compliance.expiring.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nothing expiring soon. 🎉</p>
            ) : (
              <ul className="space-y-1.5">
                {compliance.expiring.slice(0, 20).map((e, i) => (
                  <li key={i} className="flex items-center justify-between text-[11px]">
                    <span className="truncate"><span className="font-medium text-foreground">{e.who}</span> · {e.doc}</span>
                    <span className={e.days <= 30 ? "text-destructive font-semibold" : e.days <= 60 ? "text-warning font-semibold" : "text-muted-foreground"}>
                      {e.days}d
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* Date range for hours / perf */}
        <div className="grid grid-cols-2 gap-3 mt-6 mb-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {/* Hours & payroll */}
        <Section icon={DollarSign} title="Hours & payroll summary">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <KPI label="Hours" value={totals.hours.toFixed(1)} />
            <KPI label="Shifts" value={String(totals.shifts)} />
            <KPI label="Gross pay" value={`$${totals.pay.toFixed(0)}`} />
          </div>
        </Section>

        {/* Shift performance */}
        <Section icon={Clock} title="Shift performance">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <KPI label="On-time" value={`${onTimePct}%`} />
            <KPI label="Missed" value={String(totals.missed)} tone={totals.missed > 0 ? "warn" : undefined} />
            <KPI label="GPS verified" value={`${gpsPct}%`} />
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-2 font-semibold">Caregiver</th>
                  <th className="text-right p-2 font-semibold">Hrs</th>
                  <th className="text-right p-2 font-semibold">Pay</th>
                  <th className="text-right p-2 font-semibold">On-time</th>
                  <th className="text-right p-2 font-semibold">Missed</th>
                </tr>
              </thead>
              <tbody>
                {perCg.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No shifts in range.</td></tr>
                ) : perCg.map((r: any) => {
                  const tot = r.onTime + r.late;
                  const pct = tot > 0 ? Math.round((r.onTime / tot) * 100) : 0;
                  return (
                    <tr key={r.caregiver.id} className="border-t border-border">
                      <td className="p-2 truncate max-w-[110px]">{r.caregiver.full_name}</td>
                      <td className="p-2 text-right">{r.hours.toFixed(1)}</td>
                      <td className="p-2 text-right">${r.pay.toFixed(0)}</td>
                      <td className="p-2 text-right">{pct}%</td>
                      <td className={`p-2 text-right ${r.missed > 0 ? "text-destructive font-semibold" : ""}`}>{r.missed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {formatDate(from)} – {formatDate(to)}
          </p>
        </Section>
      </div>
    </MobileLayout>
  );
};

function Section({ icon: Icon, title, children }: any) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatusCard({ title, counts }: { title: string; counts: { green: number; yellow: number; red: number } }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1 text-xs">
        <Row label="Complete" value={counts.green} className="text-success" />
        <Row label="Missing docs" value={counts.yellow} className="text-warning" />
        <Row label="Blocked" value={counts.red} className="text-destructive" />
      </div>
    </div>
  );
}
function Row({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${className ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}
function KPI({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${tone === "warn" ? "text-warning" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default AdminReports;