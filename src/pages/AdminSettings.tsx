import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Shield, Users, DollarSign, Bell, Database, ExternalLink, MapPin, Loader2, ClipboardList, BarChart3, Activity, Phone, Briefcase, CalendarClock, Stethoscope, Heart, Save } from "lucide-react";
import { useAgencySettings, useUpdateAgencySettings } from "@/hooks/useAgencySettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useEffect } from "react";

const settingsItems = [
  {
    icon: DollarSign,
    title: "Billing Rates",
    description: "Manage hourly rates for clients and global defaults",
    path: "/admin/billing",
  },
  {
    icon: ClipboardList,
    title: "Care Task Templates",
    description: "Define default tasks per care type and assign them to shifts",
    path: "/admin/settings/care-tasks",
  },
  {
    icon: BarChart3,
    title: "Task Analytics",
    description: "Completion rates by caregiver and care type",
    path: "/admin/analytics/tasks",
  },
  {
    icon: Users,
    title: "Staff Management",
    description: "Create and manage caregiver accounts and roles",
    path: "/admin/caregivers/new",
  },
  {
    icon: Mail,
    title: "Email Configuration",
    description: "Set up branded emails from comfortlink.app",
    path: null,
    action: "email-setup",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure automated alerts and notification triggers",
    path: "/admin/settings/notifications",
  },
  {
    icon: Shield,
    title: "Security & Access",
    description: "Role-based access control and audit logs",
    path: "/admin/settings/security",
  },
  {
    icon: Database,
    title: "Data Management",
    description: "Export data, manage backups, and compliance settings",
    path: "/admin/settings/data",
  },
  {
    icon: Activity,
    title: "System Status",
    description: "Asset health, logo verification, and environment checks",
    path: "/admin/status",
  },
];

const AdminSettings = () => {
  const navigate = useNavigate();
  const [showEmailInfo, setShowEmailInfo] = useState(false);
  const { data: settings, isLoading: settingsLoading } = useAgencySettings();
  const updateSettings = useUpdateAgencySettings();
  const [radius, setRadius] = useState<string>("");
  const [accuracy, setAccuracy] = useState<string>("");
  const [repeat, setRepeat] = useState<string>("");
  const [contacts, setContacts] = useState({
    agency_name: "",
    agency_phone: "",
    agency_email: "",
    scheduler_name: "",
    scheduler_phone: "",
    scheduler_email: "",
    clinical_supervisor_name: "",
    clinical_supervisor_phone: "",
    clinical_supervisor_email: "",
    family_contact_label: "",
    family_contact_phone: "",
    family_contact_email: "",
    documents_url: "",
  });

  useEffect(() => {
    if (settings) {
      setRadius(String(settings.geofence_radius_m));
      setAccuracy(String(settings.accuracy_threshold_m));
      setRepeat(String(settings.repeat_failure_threshold));
      setContacts({
        agency_name: settings.agency_name ?? "",
        agency_phone: settings.agency_phone ?? "",
        agency_email: settings.agency_email ?? "",
        scheduler_name: settings.scheduler_name ?? "",
        scheduler_phone: settings.scheduler_phone ?? "",
        scheduler_email: settings.scheduler_email ?? "",
        clinical_supervisor_name: settings.clinical_supervisor_name ?? "",
        clinical_supervisor_phone: settings.clinical_supervisor_phone ?? "",
        clinical_supervisor_email: settings.clinical_supervisor_email ?? "",
        family_contact_label: settings.family_contact_label ?? "",
        family_contact_phone: settings.family_contact_phone ?? "",
        family_contact_email: settings.family_contact_email ?? "",
        documents_url: settings.documents_url ?? "",
      });
    }
  }, [settings]);

  const saveThresholds = async () => {
    const r = parseInt(radius, 10);
    const a = parseInt(accuracy, 10);
    const rp = parseInt(repeat, 10);
    if (!Number.isFinite(r) || r < 25 || r > 5000) return toast.error("Geofence radius must be 25–5000 m");
    if (!Number.isFinite(a) || a < 10 || a > 1000) return toast.error("Accuracy threshold must be 10–1000 m");
    if (!Number.isFinite(rp) || rp < 1 || rp > 20) return toast.error("Repeat-failure threshold must be 1–20");
    try {
      await updateSettings.mutateAsync({
        geofence_radius_m: r,
        accuracy_threshold_m: a,
        repeat_failure_threshold: rp,
      });
      toast.success("Thresholds updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const handleItemClick = (item: typeof settingsItems[0]) => {
    if (item.action === "email-setup") {
      setShowEmailInfo(true);
      return;
    }
    if (item.path) navigate(item.path);
  };

  const saveContacts = async () => {
    try {
      await updateSettings.mutateAsync(contacts);
      toast.success("Quick Contacts updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const contactRoles: Array<{
    icon: any;
    title: string;
    nameKey: keyof typeof contacts | null;
    namePlaceholder: string;
    phoneKey: keyof typeof contacts;
    emailKey: keyof typeof contacts;
  }> = [
    { icon: Briefcase, title: "Agency", nameKey: "agency_name", namePlaceholder: "Angels of Comfort HQ", phoneKey: "agency_phone", emailKey: "agency_email" },
    { icon: CalendarClock, title: "Scheduler", nameKey: "scheduler_name", namePlaceholder: "Scheduler name", phoneKey: "scheduler_phone", emailKey: "scheduler_email" },
    { icon: Stethoscope, title: "Clinical Supervisor", nameKey: "clinical_supervisor_name", namePlaceholder: "Supervisor name", phoneKey: "clinical_supervisor_phone", emailKey: "clinical_supervisor_email" },
    { icon: Heart, title: "Family Contact", nameKey: "family_contact_label", namePlaceholder: "Label shown to caregivers", phoneKey: "family_contact_phone", emailKey: "family_contact_email" },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Settings</h2>
            <p className="text-xs text-muted-foreground">System configuration & preferences</p>
          </div>
        </div>

        <div className="space-y-3">
          {settingsItems.map((item) => (
            <Card
              key={item.title}
              className={`border-border ${item.path || item.action ? "cursor-pointer hover:border-primary/30 transition-colors" : "opacity-70"}`}
              onClick={() => handleItemClick(item)}
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{item.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm">Geofence & GPS Thresholds</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Global agency rules used to verify visits and flag suspicious shifts.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {settingsLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="radius" className="text-xs">Geofence radius (meters)</Label>
                  <Input id="radius" type="number" min={25} max={5000} value={radius} onChange={(e) => setRadius(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">Caregivers must be within this distance of the client to clock in/out.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="accuracy" className="text-xs">GPS accuracy threshold (meters)</Label>
                  <Input id="accuracy" type="number" min={10} max={1000} value={accuracy} onChange={(e) => setAccuracy(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">Visits with GPS accuracy worse than this are flagged for review.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="repeat" className="text-xs">Repeat geofence-failure threshold</Label>
                  <Input id="repeat" type="number" min={1} max={20} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">Caregivers with this many flagged visits get an extra high-severity warning.</p>
                </div>
                <button
                  onClick={saveThresholds}
                  disabled={updateSettings.isPending}
                  className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {updateSettings.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save thresholds
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Communication directory */}
        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm">Quick Contacts</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Phone and email shown in the caregiver Messages screen's Quick Contacts.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            {settingsLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (
              <>
                {contactRoles.map((role) => (
                  <div key={role.title} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <role.icon className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">{role.title}</p>
                    </div>
                    {role.nameKey && (
                      <Input
                        value={(contacts as any)[role.nameKey]}
                        onChange={(e) => setContacts((c) => ({ ...c, [role.nameKey as string]: e.target.value }))}
                        placeholder={role.namePlaceholder}
                      />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={(contacts as any)[role.phoneKey]}
                        onChange={(e) => setContacts((c) => ({ ...c, [role.phoneKey as string]: e.target.value }))}
                        placeholder="Phone"
                        type="tel"
                      />
                      <Input
                        value={(contacts as any)[role.emailKey]}
                        onChange={(e) => setContacts((c) => ({ ...c, [role.emailKey as string]: e.target.value }))}
                        placeholder="Email"
                        type="email"
                      />
                    </div>
                  </div>
                ))}

                <div className="space-y-1">
                  <Label className="text-xs">Agency documents link (optional)</Label>
                  <Input
                    value={contacts.documents_url}
                    onChange={(e) => setContacts((c) => ({ ...c, documents_url: e.target.value }))}
                    placeholder="https://…"
                    type="url"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Opens when caregivers tap "View documents" from the Agency contact.
                  </p>
                </div>

                <button
                  onClick={saveContacts}
                  disabled={updateSettings.isPending}
                  className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Quick Contacts
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {showEmailInfo && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Domain Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <p className="text-xs text-muted-foreground">
                To send branded registration emails from <strong>comfortlink.app</strong>, 
                set up a sender domain through Resend or any other SMPT platform like mailgun, Brevo etc. This lets your emails come from 
                your own domain (e.g., noreply@comfortlink.app) instead of a generic address.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Steps:</p>
              </div>
              <button
                onClick={() => setShowEmailInfo(false)}
                className="text-xs text-primary font-medium"
              >
                Dismiss
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
};

export default AdminSettings;
