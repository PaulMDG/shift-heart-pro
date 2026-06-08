import { useEffect, useState } from "react";
import { getRouteFallbackLog, subscribeRouteFallbackLog, type RouteFallbackEntry } from "@/lib/routeFallbackLog";

export function useRouteFallbackLog(): RouteFallbackEntry[] {
  const [entries, setEntries] = useState<RouteFallbackEntry[]>(() => getRouteFallbackLog());
  useEffect(() => {
    const cb = () => setEntries(getRouteFallbackLog());
    const unsub = subscribeRouteFallbackLog(cb);
    const onStorage = (e: StorageEvent) => { if (e.key && e.key.startsWith("route-fallback-log")) cb(); };
    window.addEventListener("storage", onStorage);
    return () => { unsub(); window.removeEventListener("storage", onStorage); };
  }, []);
  return entries;
}