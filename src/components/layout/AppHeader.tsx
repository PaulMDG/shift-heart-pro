import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const AppHeader = () => {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 gradient-header shadow-md">
      <div className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
            ComfortLink Pro
          </h1>
          <p className="text-xs text-primary-foreground/70 font-medium">
            Homecare Management
          </p>
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors"
        >
          <Bell className="w-5 h-5 text-primary-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
