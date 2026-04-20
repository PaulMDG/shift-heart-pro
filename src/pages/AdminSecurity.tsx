import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Users, Lock, FileCheck } from "lucide-react";
import { useAllCaregivers } from "@/hooks/useAdmin";

const AdminSecurity = () => {
  const navigate = useNavigate();
  const { data: users = [] } = useAllCaregivers();

  const counts = users.reduce(
    (acc: any, u: any) => {
      const r = u.role || "user";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    { admin: 0, moderator: 0, user: 0 }
  );

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/settings")} className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Shield className="w-5 h-5" /> Security & Access</h2>
            <p className="text-xs text-muted-foreground">Role-based access control</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["admin", "moderator", "user"] as const).map((r) => (
            <Card key={r} className="border-border">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{counts[r] || 0}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{r}s</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> Access Policies</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Row-Level Security (RLS)</span><Badge variant="secondary">Enabled</Badge></div>
            <div className="flex justify-between"><span>Admin portal isolation</span><Badge variant="secondary">Enforced</Badge></div>
            <div className="flex justify-between"><span>Caregiver shift mutation guard</span><Badge variant="secondary">Active</Badge></div>
            <div className="flex justify-between"><span>Service-role JWT validation</span><Badge variant="secondary">getClaims()</Badge></div>
          </CardContent>
        </Card>

        <Card className="border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/admin")}>
          <CardHeader className="p-4 flex flex-row items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">Manage User Roles</CardTitle>
              <CardDescription className="text-xs">Assign or revoke admin/moderator/user roles</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border opacity-70">
          <CardHeader className="p-4 flex flex-row items-center gap-3">
            <FileCheck className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Audit Logs</CardTitle>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Coming Soon</span>
              </div>
              <CardDescription className="text-xs">Track admin actions and login events</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default AdminSecurity;
