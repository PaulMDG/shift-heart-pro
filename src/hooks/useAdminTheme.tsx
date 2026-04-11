import { useEffect } from "react";
import { useIsAdmin } from "@/hooks/useRole";
import { useLocation } from "react-router-dom";

export function useAdminTheme() {
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin && isAdminRoute) {
      document.documentElement.classList.add("admin-theme");
    } else {
      document.documentElement.classList.remove("admin-theme");
    }
    return () => {
      document.documentElement.classList.remove("admin-theme");
    };
  }, [isAdmin, isAdminRoute]);

  return { isAdminTheme: isAdmin && isAdminRoute };
}
