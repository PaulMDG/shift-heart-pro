import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Repeat, AlertCircle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, typeof Bell> = {
  shift: Bell,
  swap: Repeat,
  alert: AlertCircle,
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
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
                className={`bg-card rounded-2xl p-4 shadow-card ${!n.read ? "border-l-4 border-primary" : ""}`}
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
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">{timeAgo}</p>
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
