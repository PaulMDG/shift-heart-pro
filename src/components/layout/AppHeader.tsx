import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const AppHeader = () => {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur">
      <div className="grid grid-cols-3 items-center px-5 py-4 max-w-lg mx-auto">
        <div className="justify-self-start">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => navigate("/profile")}
            className="p-1 -ml-1 text-primary"
          >
            <Menu className="w-6 h-6" strokeWidth={2.25} />
          </button>
        </div>
        <div className="justify-self-center flex flex-col items-center leading-none">
          <LogoMark className="h-7 w-auto text-primary mb-1.5" />
          <h1 className="font-display text-[0.95rem] font-medium tracking-[0.32em] text-foreground uppercase">
            Angels
          </h1>
          <p className="text-[0.55rem] tracking-[0.4em] text-muted-foreground/80 uppercase mt-0.5">
            of Comfort
          </p>
        </div>
        <div className="justify-self-end">
          <button
            onClick={() => navigate("/notifications")}
            aria-label="Notifications"
            className="relative p-1"
          >
            <Bell className="w-6 h-6 text-foreground" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-background" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
