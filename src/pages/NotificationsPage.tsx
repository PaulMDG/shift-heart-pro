import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Repeat, AlertCircle, Mail, MailX, CheckCheck, RefreshCw } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useNotifications";
import { retryNotificationEmail } from "@/lib/notifyEmail";
import { toast } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

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
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
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
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : notifications.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = iconMap[n.type] || Bell;
            const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });
            return (
              <div
                key={n.id}
                className={`bg-card rounded-2xl p-4 shadow-card cursor-pointer transition-colors ${!n.read ? "border-l-4 border-primary" : ""}`}
                onClick={() => { if (!n.read) markRead.mutate(n.id); }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "gradient-primary" : "bg-muted"}`}>
                    <Icon className={`w-4 h-4 ${!n.read ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm ${!n.read ? "font-bold text-card-foreground" : "font-medium text-card-foreground"}`}>
                      {n.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-[10px] text-muted-foreground/60">{timeAgo}</p>
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
