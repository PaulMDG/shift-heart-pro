import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, Download, FileSpreadsheet, Archive } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useAllShifts, useAllClients, useAllCaregivers } from "@/hooks/useAdmin";

function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AdminDataManagement = () => {
  const navigate = useNavigate();
  const { data: shifts = [] } = useAllShifts();
  const { data: clients = [] } = useAllClients();
  const { data: caregivers = [] } = useAllCaregivers();

  const exports = [
    {
      icon: FileSpreadsheet,
      title: "Export Shifts",
      desc: `${shifts.length} records · CSV`,
      onClick: () => {
        const flat = shifts.map((s: any) => ({
          id: s.id, date: s.date, start: s.start_time, end: s.end_time, status: s.status,
          timesheet_status: s.timesheet_status, client: s.client?.name, caregiver: s.caregiver?.full_name,
        }));
        download(`shifts-${Date.now()}.csv`, toCSV(flat));
        toast.success("Shifts exported");
      },
    },
    {
      icon: FileSpreadsheet,
      title: "Export Clients",
      desc: `${clients.length} records · CSV`,
      onClick: () => {
        download(`clients-${Date.now()}.csv`, toCSV(clients));
        toast.success("Clients exported");
      },
    },
    {
      icon: FileSpreadsheet,
      title: "Export Caregivers",
      desc: `${caregivers.length} records · CSV`,
      onClick: () => {
        const flat = caregivers.map((c: any) => ({
          id: c.id, full_name: c.full_name, phone: c.phone, role: c.role,
        }));
        download(`caregivers-${Date.now()}.csv`, toCSV(flat));
        toast.success("Caregivers exported");
      },
    },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/settings")} className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Database className="w-5 h-5" /> Data Management</h2>
            <p className="text-xs text-muted-foreground">Exports, backups & compliance</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Data Exports</CardTitle>
            <CardDescription className="text-xs">Download CSV snapshots for offline analysis</CardDescription>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {exports.map((e) => (
              <button key={e.title} onClick={e.onClick} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left">
                <e.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.desc}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border opacity-70">
          <CardHeader className="p-4 flex flex-row items-center gap-3">
            <Archive className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Backups & Retention</CardTitle>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Coming Soon</span>
              </div>
              <CardDescription className="text-xs">Automatic daily backups managed by Supabase. HIPAA retention policies coming soon.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default AdminDataManagement;
