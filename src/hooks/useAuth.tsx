import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setLoading(false);

      // After email confirmation, apply any pending profile updates
      if (event === "SIGNED_IN" && session?.user) {
        const pending = sessionStorage.getItem("pending_profile_update");
        if (pending) {
          try {
            const updates = JSON.parse(pending);
            await supabase.from("profiles").update(updates).eq("id", session.user.id);
          } catch (e) {
            console.warn("[AuthProvider] pending profile update failed:", e);
          } finally {
            sessionStorage.removeItem("pending_profile_update");
          }
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
