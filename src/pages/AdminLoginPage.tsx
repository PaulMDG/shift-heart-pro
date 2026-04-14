import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Shield, Loader2 } from "lucide-react";

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

      // Verify user is actually an admin
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, hsl(142, 60%, 15%) 0%, hsl(142, 50%, 25%) 50%, hsl(142, 40%, 20%) 100%)" }}>
      <Card className="w-full max-w-sm border-0 shadow-2xl" style={{ background: "hsl(142, 30%, 10%)", borderColor: "hsl(142, 40%, 30%)" }}>
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, hsl(142, 70%, 45%), hsl(142, 60%, 35%))" }}>
            <Shield className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">ComfortLink Pro</CardTitle>
          <CardDescription className="text-emerald-300/70">
            Administrator Portal
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-emerald-200/80">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@comfortlink.app"
                required
                className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-300/40 focus:border-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-emerald-200/80">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-white/10 border-emerald-600/30 text-white placeholder:text-emerald-300/40 focus:border-emerald-400"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full text-white font-bold"
              disabled={loading}
              style={{ background: "linear-gradient(135deg, hsl(142, 70%, 45%), hsl(142, 60%, 35%))" }}
            >
              {loading && <Loader2 className="animate-spin mr-2" />}
              Sign In as Admin
            </Button>
            <button
              type="button"
              className="text-sm text-emerald-400/60 hover:text-emerald-300 transition-colors"
              onClick={() => navigate("/auth")}
            >
              ← Back to Caregiver Login
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
