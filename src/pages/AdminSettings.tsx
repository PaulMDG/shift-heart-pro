import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Shield, Users, DollarSign, Bell, Database, ExternalLink } from "lucide-react";

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
];

const AdminSettings = () => {
  const navigate = useNavigate();
  const [showEmailInfo, setShowEmailInfo] = useState(false);

  const handleItemClick = (item: typeof settingsItems[0]) => {
    if (item.action === "email-setup") {
      setShowEmailInfo(true);
      return;
    }
    if (item.path) navigate(item.path);
  };

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
                set up a sender domain through Lovable Cloud. This lets your emails come from 
                your own domain (e.g., notify@comfortlink.app) instead of a generic address.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Steps:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open <strong>Cloud → Emails</strong> in your Lovable project settings</li>
                  <li>Click "Set up email domain" and enter <strong>comfortlink.app</strong></li>
                  <li>Add the provided DNS records at your domain registrar</li>
                  <li>Wait for DNS verification (up to 72 hours)</li>
                </ol>
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
