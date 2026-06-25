import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "@/components/notifications/NotificationBell";

const AppHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-[hsl(var(--ivory-border))]">
      <div className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => navigate("/profile")}
          className="p-1 -ml-1 text-primary"
        >
          <Menu className="w-6 h-6" strokeWidth={2.25} />
        </button>
        <NotificationBell className="p-1 text-primary" />
      </div>
    </header>
  );
};

export default AppHeader;
