import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { LogoMark } from "@/components/brand/Logo";

const AppHeader = () => {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 gradient-header shadow-md">
      <div className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <LogoMark className="h-8 w-auto text-primary" />
          <div className="flex flex-col leading-none">
            <h1 className="font-display text-lg font-semibold tracking-[0.18em] text-foreground uppercase">
              Angels
            </h1>
            <p className="text-[0.55rem] tracking-[0.32em] text-muted-foreground uppercase mt-0.5">
              of Comfort
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-full bg-secondary/60 hover:bg-secondary border border-border/40 transition-colors"
        >
          <Bell className="w-5 h-5 text-foreground" />
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
