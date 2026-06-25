import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Repeat, AlertCircle, Mail, MailX, CheckCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead, useNotificationErrorCount } from "@/hooks/useNotifications";
import { retryNotificationEmail } from "@/lib/notifyEmail";
import { toast } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";

const iconMap: Record<string, typeof Bell> = {
  shift: Bell,
  swap: Repeat,
  alert: AlertCircle,
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const { data: errorCount = 0 } = useNotificationErrorCount();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRetryEmail = async (e: React.MouseEvent, notificationId: string, payload: any) => {
    e.stopPropagation();
    setRetrying(notificationId);
    const success = await retryNotificationEmail(notificationId, payload);
    if (success) {
      toast.success("Email resent successfully");
    } else {
      toast.error("Email retry failed");
    }
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    setRetrying(null);
  };

  const emailStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="text-[10px] gap-1 border-green-300 text-green-700 bg-green-50">
            <Mail className="w-3 h-3" /> Emailed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive bg-destructive/5 cursor-default">
            <MailX className="w-3 h-3" /> Email failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-canvas-foreground max-w-lg mx-auto">
      <div className="sticky top-0 z-40 bg-surface border-b border-[hsl(var(--ivory-border))] px-5 py-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="focus-ring w-11 h-11 -ml-2 rounded-xl flex items-center justify-center text-surface-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-surface-foreground">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {errorCount > 0 && (
          <button
            onClick={() => navigate("/admin/notification-errors")}
            className="w-full flex items-center gap-3 bg-destructive/5 border border-destructive/30 rounded-2xl p-3 text-left hover:bg-destructive/10 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                {errorCount} notification {errorCount === 1 ? "error" : "errors"} logged
              </p>
              <p className="text-[11px] text-muted-foreground">
                Tap to inspect failing payloads (admin only)
              </p>
            </div>
          </button>
        )}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : notifications.length === 0 ? (
          <div className="bg-surface text-surface-foreground rounded-2xl p-8 text-center border border-[hsl(var(--ivory-border))] shadow-soft">
            <Bell className="w-8 h-8 mx-auto mb-3 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-surface-foreground">
              You're all caught up
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Shift updates, care alerts, and clock-in reminders will appear
              here as they happen.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = iconMap[n.type] || Bell;
            const timeAgo = formatRelativeTime(n.created_at);
            return (
              <div
                key={n.id}
                className={`bg-surface text-surface-foreground rounded-2xl p-4 shadow-soft cursor-pointer transition-colors border border-[hsl(var(--ivory-border))] ${!n.read ? "border-l-4 border-l-primary" : ""}`}
                onClick={() => { if (!n.read) markRead.mutate(n.id); }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "gradient-primary" : "bg-muted"}`}>
                    <Icon className={`w-4 h-4 ${!n.read ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm ${!n.read ? "font-bold text-surface-foreground" : "font-medium text-surface-foreground"}`}>
                      {n.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-[11px] text-muted-foreground font-medium">{timeAgo}</p>
                      {emailStatusBadge((n as any).email_status)}
                      {(n as any).email_status === "failed" && (n as any).email_payload && (
                        <button
                          onClick={(e) => handleRetryEmail(e, n.id, (n as any).email_payload)}
                          disabled={retrying === n.id}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${retrying === n.id ? "animate-spin" : ""}`} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
