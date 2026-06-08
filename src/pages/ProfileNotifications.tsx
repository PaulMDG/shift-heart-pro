import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bell } from "lucide-react";
import { toast } from "sonner";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/hooks/useNotificationPrefs";

const ProfileNotifications = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  const toggle = (key: "in_shift_messages" | "admin_alerts", value: boolean) => {
    update.mutate(
      { [key]: value } as any,
      { onError: (e: any) => toast.error(e?.message || "Failed to save") },
    );
  };

  const items: { key: "in_shift_messages" | "admin_alerts"; title: string; desc: string }[] = [
    {
      key: "in_shift_messages",
      title: "In-shift messages",
      desc: "Push when someone sends you a chat tied to an active shift",
    },
    {
      key: "admin_alerts",
      title: "Admin alerts",
      desc: "Receive shift-related alerts that admins broadcast to caregivers",
    },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notification Preferences
            </h2>
            <p className="text-xs text-muted-foreground">Control which push alerts you receive</p>
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="p-2 divide-y divide-border">
            {isLoading ? (
              <div className="p-3 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              items.map((it) => (
                <div key={it.key} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{it.title}</p>
                    <p className="text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                  <Switch
                    checked={data?.[it.key] ?? true}
                    onCheckedChange={(v) => toggle(it.key, v)}
                    disabled={update.isPending}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Preferences sync across all your devices. Push delivery still requires you to enable notifications in your browser.
        </p>
      </div>
    </MobileLayout>
  );
};

export default ProfileNotifications;