import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import comfortlinkLogo from "@/assets/comfortlink-logo.gif";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const [showPassword, setShowPassword] = useState(false);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Block admins from caregiver portal
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin");

        if (roles && roles.length > 0) {
          await supabase.auth.signOut();
          toast.error("Admins must sign in via the Admin Portal.");
          navigate("/admin/login");
          return;
        }

        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Profile biodata (address, ssn) will be saved after email confirmation
        // when the user is redirected back and has an active session.
        // Store in sessionStorage so we can apply after confirmation redirect.
        if (address || ssnLast4) {
          sessionStorage.setItem("pending_profile_update", JSON.stringify({
            address: address || null,
            ssn_last4: ssnLast4 || null,
          }));
        }

        toast.success("Account created! Check your email to confirm your account.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <img src={comfortlinkLogo} alt="ComfortLink" className="mx-auto h-16 w-16 rounded-xl" />
          <CardTitle className="text-2xl">ComfortLink</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required={!isLogin}
                />
              </div>
            )}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, ST 12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssn">SSN (Last 4 digits)</Label>
                  <Input
                    id="ssn"
                    value={ssnLast4}
                    onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
            
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  required
                  minLength={6}
                  className="pr-10"
                />
            
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-1"
              onClick={() => navigate("/admin/login")}
            >
              Admin Portal →
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AuthPage;
