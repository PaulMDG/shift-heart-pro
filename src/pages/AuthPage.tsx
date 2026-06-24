import { useState } from "react";
import { Loader2, Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import Logo from "@/components/brand/Logo";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(
        error?.message ??
          `${provider === "google" ? "Google" : "Apple"} sign-in failed. Please try again.`,
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Ambient warm glow in the corner */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, hsl(32 55% 58% / 0.18), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-8">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <Logo wordmarkClassName="text-xl" />
        </div>

        {/* Hero copy */}
        <div className="mt-10">
          <h1 className="font-display text-5xl leading-[1.05] text-foreground">
            {isLogin ? "Welcome back" : "Join the family"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-xs">
            {isLogin
              ? "Sign in to your caregiver account and start your day with purpose."
              : "Create your caregiver account to begin serving with compassion."}
          </p>
        </div>

        {/* Form panel */}
        <form
          onSubmit={handleSubmit}
          className="glass-panel mt-10 rounded-2xl p-6 space-y-5"
        >
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="h-12 bg-background/60 border-border/60"
              />
            </div>
          )}

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-foreground">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, ST 12345"
                  className="h-12 bg-background/60 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssn" className="text-foreground">SSN (last 4)</Label>
                <Input
                  id="ssn"
                  value={ssnLast4}
                  onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className="h-12 bg-background/60 border-border/60"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="h-12 pl-10 bg-background/60 border-border/60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
                className="h-12 pl-10 pr-10 bg-background/60 border-border/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => toast.info("Password reset coming soon — please contact your administrator.")}
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-xl gradient-primary text-primary-foreground hover:opacity-95 transition-opacity"
          >
            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {isLogin ? "Sign in" : "Create account"}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-xs text-muted-foreground">or continue with</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          {/* OAuth buttons (UI only) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="w-full h-12 rounded-xl border border-border/60 bg-background/40 hover:bg-background/70 transition-colors flex items-center justify-center gap-3 text-sm font-medium text-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path fill="#EA4335" d="M12 10.2v3.96h5.52c-.24 1.44-1.74 4.2-5.52 4.2-3.3 0-6-2.76-6-6.18s2.7-6.18 6-6.18c1.86 0 3.12.78 3.84 1.5l2.64-2.52C16.74 3.36 14.58 2.4 12 2.4 6.66 2.4 2.4 6.66 2.4 12s4.26 9.6 9.6 9.6c5.52 0 9.18-3.9 9.18-9.36 0-.6-.06-1.08-.18-1.56H12z" />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("apple")}
              className="w-full h-12 rounded-xl border border-border/60 bg-background/40 hover:bg-background/70 transition-colors flex items-center justify-center gap-3 text-sm font-medium text-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden>
                <path d="M16.36 12.84c.02 2.46 2.16 3.28 2.18 3.28-.02.06-.34 1.16-1.12 2.3-.66 1-1.36 1.98-2.46 2-1.08.02-1.42-.64-2.66-.64-1.24 0-1.62.62-2.64.66-1.06.04-1.86-1.08-2.54-2.06C5.74 16.36 4.7 12.78 6.16 10.34c.72-1.2 2-1.96 3.4-1.98 1.04-.02 2.02.7 2.66.7.64 0 1.84-.86 3.1-.74.52.02 2 .22 2.96 1.6-.08.04-1.76 1.02-1.92 3.04zM14.6 6.6c.56-.7.94-1.66.84-2.62-.82.04-1.82.56-2.4 1.24-.52.6-.98 1.6-.86 2.54.92.06 1.86-.46 2.42-1.16z" />
              </svg>
              Continue with Apple
            </button>
          </div>
        </form>

        {/* Switch + admin link */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "New to Angels of Comfort? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-primary hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground/80">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p>
            Your data is protected with enterprise-grade security and privacy standards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/login")}
          className="mt-3 text-center text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          Admin Portal →
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
