import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bell, BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useEffect, useState } from "react";
import { requestPushPermission, getPushPermissionState } from "@/lib/onesignal";

const ProfileNotifications = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const [pushState, setPushState] = useState<"granted" | "denied" | "default" | "unsupported">(
    "default",
  );
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    setPushState(getPushPermissionState());
  }, []);

  const handleEnablePush = async () => {
    setEnabling(true);
    try {
      const ok = await requestPushPermission();
      setPushState(getPushPermissionState());
      if (ok) toast.success("Push notifications enabled");
      else toast.message("Push not enabled", { description: "You can enable it later from this screen or your browser settings." });
    } finally {
      setEnabling(false);
    }
  };

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
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushState === "granted" ? "bg-emerald-500/15 text-emerald-500" : "bg-accent text-accent-foreground"}`}>
              {pushState === "granted" ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Browser push notifications</p>
              <p className="text-xs text-muted-foreground">
                {pushState === "granted" && "Enabled on this device."}
                {pushState === "denied" && "Blocked. Enable from your browser site settings."}
                {pushState === "default" && "Allow alerts even when the app is closed."}
                {pushState === "unsupported" && "This browser does not support push notifications."}
              </p>
            </div>
            {pushState !== "granted" && pushState !== "unsupported" && (
              <Button size="sm" onClick={handleEnablePush} disabled={enabling || pushState === "denied"}>
                {enabling ? "…" : pushState === "denied" ? "Blocked" : "Enable"}
              </Button>
            )}
          </CardContent>
        </Card>

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