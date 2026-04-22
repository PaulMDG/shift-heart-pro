import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Shield, Users, Lock, FileCheck, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAllCaregivers } from "@/hooks/useAdmin";
import { useSecurityAudit } from "@/hooks/useSecurityAudit";

const AdminSecurity = () => {
  const navigate = useNavigate();
  const { data: users = [] } = useAllCaregivers();
  const { data: audit, isLoading: auditLoading, refetch, isFetching } = useSecurityAudit();
  const failing = (audit ?? []).filter((c) => !c.ok);

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

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" /> Live RLS Audit
              </CardTitle>
              <CardDescription className="text-xs">
                Probes clients PII, safe view masking, and avatars bucket.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Re-run
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {auditLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {!auditLoading && failing.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-2">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {failing.length} access-control issue{failing.length === 1 ? "" : "s"} detected
                </p>
              </div>
            )}

            {!auditLoading &&
              (audit ?? []).map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 ${
                    c.ok ? "border-border" : "border-destructive/40 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{c.label}</p>
                      <p className="text-[11px] text-muted-foreground">{c.description}</p>
                      <p className="text-[11px] mt-1 break-words text-muted-foreground/80">
                        {c.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
