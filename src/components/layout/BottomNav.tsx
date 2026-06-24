import { Home, CalendarDays, ClipboardList, MessageCircle, MoreHorizontal, Shield, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useRole";
import { useNotifications } from "@/hooks/useNotifications";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = isAdmin
    ? [
        { icon: Shield, label: "Admin", path: "/admin" },
        { icon: User, label: "Profile", path: "/profile" },
      ]
    : [
        { icon: Home, label: "Home", path: "/" },
        { icon: CalendarDays, label: "Schedule", path: "/shifts" },
        { icon: ClipboardList, label: "Tasks", path: "/tasks" },
        { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadCount },
        { icon: MoreHorizontal, label: "More", path: "/profile" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-canvas/95 backdrop-blur border-t border-[hsl(var(--ivory-border))]">
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-2 pt-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-start gap-1 px-3 pt-2 pb-2 mx-0.5 min-w-[60px] flex-1 rounded-2xl transition-colors ${
                isActive ? "bg-primary/10" : "bg-transparent"
              }`}
            >
              {isActive && (
                <span className="absolute -top-px h-[3px] w-10 rounded-full bg-primary shadow-gold-glow" />
              )}
              <div className="relative">
                <item.icon
                  className={`w-[22px] h-[22px] transition-colors ${
                    isActive ? "text-primary fill-primary/25" : "text-[hsl(217_25%_45%)]"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {"badge" in item && (item as any).badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {(item as any).badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] ${
                  isActive ? "text-primary font-bold" : "text-[hsl(217_20%_45%)] font-medium"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-canvas" />
    </nav>
  );
};

export default BottomNav;
