import OneSignal from "react-onesignal";

// OneSignal App ID — public/publishable key, safe in client code.
// Reads from VITE env var; falls back to empty string (init will be skipped).
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || "";

let initialized = false;
let promptedThisSession = false;

export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === "undefined") return;
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === "YOUR_ONESIGNAL_APP_ID") {
    console.warn("[OneSignal] App ID not configured — skipping init");
    return;
  }
  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: false,
              text: {
                actionMessage:
                  "Get real-time alerts for new messages, shift updates, and admin notices.",
                acceptButton: "Enable",
                cancelButton: "Not now",
              },
            },
          ],
        },
      },
    });
    initialized = true;
    console.log("[OneSignal] Initialized");
  } catch (e) {
    console.error("[OneSignal] Init failed:", e);
  }
}

/** Link the currently logged-in Supabase user to OneSignal via external_id */
export async function setOneSignalUser(userId: string): Promise<void> {
  if (!initialized) return;
  try {
    await OneSignal.login(userId);
    // Soft-prompt for push permission shortly after sign-in (once per session).
    if (!promptedThisSession) {
      promptedThisSession = true;
      try {
        const perm = (OneSignal as any).Notifications?.permission;
        if (perm !== true && perm !== "granted") {
          setTimeout(() => {
            (OneSignal as any).Slidedown?.promptPush?.().catch(() => {});
          }, 3000);
        }
      } catch {
        /* noop */
      }
    }
  } catch (e) {
    console.warn("[OneSignal] setUser failed:", e);
  }
}

/** Clear OneSignal identity on logout */
export async function clearOneSignalUser(): Promise<void> {
  if (!initialized) return;
  try {
    await OneSignal.logout();
  } catch (e) {
    console.warn("[OneSignal] clearUser failed:", e);
  }
}

/** Manually request push permission (e.g. from a settings button). */
export async function requestPushPermission(): Promise<boolean> {
  if (!initialized) {
    await initOneSignal();
  }
  try {
    await (OneSignal as any).Slidedown?.promptPush?.({ force: true });
    const perm = (OneSignal as any).Notifications?.permission;
    return perm === true || perm === "granted";
  } catch (e) {
    console.warn("[OneSignal] requestPushPermission failed:", e);
    return false;
  }
}

/** Current push permission state: 'granted' | 'denied' | 'default' | 'unsupported' */
export function getPushPermissionState(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const p = window.Notification.permission;
  if (p === "granted") return "granted";
  if (p === "denied") return "denied";
  return "default";
}