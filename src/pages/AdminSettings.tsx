import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Shield, Users, DollarSign, Bell, Database } from "lucide-react";

const settingsItems = [
  {
    icon: DollarSign,
    title: "Billing Rates",
    description: "Manage hourly rates for clients and global defaults",
    path: "/admin/billing",
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
    description: "Set up branded emails for registration confirmations",
    path: null,
    badge: "Coming Soon",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure automated alerts and notification triggers",
    path: null,
    badge: "Coming Soon",
  },
  {
    icon: Shield,
    title: "Security & Access",
    description: "Role-based access control and audit logs",
    path: null,
    badge: "Coming Soon",
  },
  {
    icon: Database,
    title: "Data Management",
    description: "Export data, manage backups, and compliance settings",
    path: null,
    badge: "Coming Soon",
  },
];

const AdminSettings = () => {
  const navigate = useNavigate();

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
              className={`border-border ${item.path ? "cursor-pointer hover:border-primary/30 transition-colors" : "opacity-70"}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{item.title}</CardTitle>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-0.5">{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
};

export default AdminSettings;
