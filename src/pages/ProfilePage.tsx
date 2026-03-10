import MobileLayout from "@/components/layout/MobileLayout";
import { User, Shield, FileText, LogOut, ChevronRight, Star } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const menuItems = [
  { icon: User, label: "Personal Information", description: "Name, email, phone", path: "/profile/personal" },
  { icon: Shield, label: "Certifications", description: "Licenses & background check", path: "/profile/certifications" },
  { icon: FileText, label: "Timesheets", description: "View past timesheets", path: "/profile/timesheets" },
  { icon: Star, label: "Performance", description: "Ratings & feedback", path: "/profile/performance" },
];

const ProfilePage = () => {
  const { data: profile, isLoading } = useProfile();
  const { data: notifications } = useNotifications();
  const navigate = useNavigate();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="bg-card rounded-2xl p-5 shadow-card text-center">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center ring-2 ring-card">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-40 mx-auto" />
          ) : (
            <>
              <h2 className="text-lg font-bold text-card-foreground">{profile?.full_name || "Unknown"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Certified Home Health Aide</p>
            </>
          )}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-card-foreground">—</p>
              <p className="text-[10px] text-muted-foreground">Shifts Done</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-card-foreground">—</p>
              <p className="text-[10px] text-muted-foreground">Rating</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-card-foreground">—</p>
              <p className="text-[10px] text-muted-foreground">On Time</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors ${
                i < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </button>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/20 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </MobileLayout>
  );
};

export default ProfilePage;
