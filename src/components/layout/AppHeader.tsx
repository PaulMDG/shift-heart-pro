import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import logoAsset from "@/assets/angels-of-comfort-logo.png.asset.json";

const AppHeader = () => {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-[hsl(var(--ivory-border))]">
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
        <button
          type="button"
          aria-label="Angels of Comfort home"
          onClick={() => navigate("/")}
          className="justify-self-center flex items-center justify-center bg-hero-navy rounded-xl px-3 py-1.5 shadow-soft"
        >
          <img
            src={logoAsset.url}
            alt="Angels of Comfort"
            className="h-9 w-auto object-contain"
          />
        </button>
        <div className="justify-self-end">
          <button
            onClick={() => navigate("/notifications")}
            aria-label="Notifications"
            className="relative p-1"
          >
            <Bell className="w-6 h-6 text-primary" strokeWidth={1.85} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-canvas" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
