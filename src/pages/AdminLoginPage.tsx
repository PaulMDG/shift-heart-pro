import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast.error("Access denied. Admin credentials required.");
        setLoading(false);
        return;
      }

      toast.success("Welcome, Administrator!");
      navigate("/admin");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-theme min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, hsl(38 70% 62% / 0.18), transparent 65%)",
        }}
      />
      <Card className="w-full max-w-sm glass-panel relative">
        <CardHeader className="text-center space-y-2">
          <LogoMark className="mx-auto h-14 w-auto text-primary" />
          <CardTitle className="font-display text-3xl">Angels of Comfort</CardTitle>
          <CardDescription className="tracking-[0.18em] uppercase text-xs">
            Administrator Portal
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                required
                className="h-12 bg-background/60 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                required
                minLength={6}
                className="h-12 bg-background/60 border-border/60"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Sign In
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors mt-1"
              onClick={() => navigate("/auth")}
            >
              ← Caregiver Portal
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
