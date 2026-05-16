import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Requests live geolocation permission as soon as the app loads.
 * Works in both browser and Capacitor WebView. If permission is denied
 * or unavailable, surfaces a toast explaining how to enable it.
 */
const LocationPermissionGate = () => {
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast.error("Live location is not supported on this device.");
      return;
    }

    let cancelled = false;

    const requestLocation = () => {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Start a live watch so the browser keeps the permission active
          // and the OS surfaces the in-use indicator.
          const watchId = navigator.geolocation.watchPosition(
            () => {},
            () => {},
            { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
          );
          // Stop watching when the tab is hidden to save battery.
          const onVisibility = () => {
            if (document.hidden) navigator.geolocation.clearWatch(watchId);
          };
          document.addEventListener("visibilitychange", onVisibility);
        },
        (err) => {
          if (cancelled) return;
          if (err.code === err.PERMISSION_DENIED) {
            toast.error(
              "Location permission denied. Enable location access in your browser settings to clock in/out.",
            );
          } else {
            toast.warning("Unable to read your location. Check that GPS is on.");
          }
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    };

    // Use Permissions API where available to avoid duplicate prompts.
    const perms = (navigator as any).permissions;
    if (perms?.query) {
      perms
        .query({ name: "geolocation" as PermissionName })
        .then((status: PermissionStatus) => {
          if (cancelled) return;
          if (status.state === "denied") {
            toast.error(
              "Location is blocked. Enable it in your browser site settings to use clock-in/out.",
            );
            return;
          }
          requestLocation();
        })
        .catch(() => requestLocation());
    } else {
      requestLocation();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};

export default LocationPermissionGate;