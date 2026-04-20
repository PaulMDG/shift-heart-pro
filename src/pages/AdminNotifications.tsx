import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell } from "lucide-react";
import { useState } from "react";

const AdminNotifications = () => {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({
    shiftReminders: true,
    lateClockIn: true,
    swapRequests: true,
    timesheetSubmissions: true,
    incidentAlerts: true,
    weeklyDigest: false,
  });

  const toggle = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items: { key: keyof typeof prefs; title: string; desc: string }[] = [
    { key: "shiftReminders", title: "Shift Reminders", desc: "Notify caregivers 1 hour before shift start" },
    { key: "lateClockIn", title: "Late Clock-In Alerts", desc: "Alert admins when caregiver is 15+ min late" },
    { key: "swapRequests", title: "Swap Requests", desc: "Notify on new shift swap requests" },
    { key: "timesheetSubmissions", title: "Timesheet Submissions", desc: "Notify admins of new timesheets to review" },
    { key: "incidentAlerts", title: "Incident Alerts", desc: "Immediate alerts for clock-out incident reports" },
    { key: "weeklyDigest", title: "Weekly Digest", desc: "Email summary of operations every Monday" },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/settings")} className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</h2>
            <p className="text-xs text-muted-foreground">Configure alert triggers</p>
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="p-2 divide-y divide-border">
            {items.map((it) => (
              <div key={it.key} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{it.title}</p>
                  <p className="text-xs text-muted-foreground">{it.desc}</p>
                </div>
                <Switch checked={prefs[it.key]} onCheckedChange={() => toggle(it.key)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">Preferences are saved locally. Server-side persistence coming soon.</p>
      </div>
    </MobileLayout>
  );
};

export default AdminNotifications;
