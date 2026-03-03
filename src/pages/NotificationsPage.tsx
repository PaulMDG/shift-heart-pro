import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Repeat, AlertCircle } from "lucide-react";
import { notifications } from "@/data/mockData";

const iconMap = {
  shift: Bell,
  swap: Repeat,
  alert: AlertCircle,
};

const NotificationsPage = () => {
  const navigate = useNavigate();

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
        {notifications.map((n) => {
          const Icon = iconMap[n.type];
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
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">{n.time}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
