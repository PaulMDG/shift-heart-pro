import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export type PermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

export interface LiveLocationState {
  permission: PermissionState;
  position: { lat: number; lng: number } | null;
  accuracy: number | null;
  lastFixAt: Date | null;
  error: string | null;
  /** Force a fresh fix (e.g. after user grants permission in settings) */
  refresh: () => void;
}

const Ctx = createContext<LiveLocationState | null>(null);

export function LiveLocationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastFixAt, setLastFixAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setPermission("unsupported");
      setError("Geolocation is not supported on this device.");
      return;
    }

    let cancelled = false;

    const startWatch = () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAccuracy(pos.coords.accuracy);
          setLastFixAt(new Date());
          setPermission("granted");
          setError(null);
        },
        (err) => {
          if (cancelled) return;
          if (err.code === err.PERMISSION_DENIED) {
            setPermission("denied");
            setError("Location permission denied.");
          } else {
            setError(err.message || "Unable to read location.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
      );
    };

    const requestOnce = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAccuracy(pos.coords.accuracy);
          setLastFixAt(new Date());
          setPermission("granted");
          setError(null);
          startWatch();
        },
        (err) => {
          if (cancelled) return;
          if (err.code === err.PERMISSION_DENIED) {
            setPermission("denied");
            setError("Location permission denied.");
          } else {
            setError(err.message || "Unable to read location.");
          }
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    };

    const perms = (navigator as any).permissions;
    if (perms?.query) {
      perms
        .query({ name: "geolocation" as PermissionName })
        .then((status: PermissionStatus) => {
          if (cancelled) return;
          setPermission(status.state as PermissionState);
          status.onchange = () => setPermission(status.state as PermissionState);
          if (status.state !== "denied") requestOnce();
        })
        .catch(() => requestOnce());
    } else {
      requestOnce();
    }

    const onVisibility = () => {
      if (document.hidden && watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      } else if (!document.hidden && watchIdRef.current == null && permission !== "denied") {
        startWatch();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return (
    <Ctx.Provider
      value={{ permission, position, accuracy, lastFixAt, error, refresh: () => setNonce((n) => n + 1) }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLiveLocation(): LiveLocationState {
  const v = useContext(Ctx);
  if (!v) {
    return {
      permission: "unknown",
      position: null,
      accuracy: null,
      lastFixAt: null,
      error: null,
      refresh: () => {},
    };
  }
  return v;
}