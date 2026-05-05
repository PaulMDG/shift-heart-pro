import OneSignal from "react-onesignal";

// OneSignal App ID — public/publishable key, safe in client code.
// Replace with your actual App ID from OneSignal dashboard.
const ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID";

let initialized = false;

export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === "undefined") return;
  if (ONESIGNAL_APP_ID === "YOUR_ONESIGNAL_APP_ID") {
    console.warn("[OneSignal] App ID not configured — skipping init");
    return;
  }
  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
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