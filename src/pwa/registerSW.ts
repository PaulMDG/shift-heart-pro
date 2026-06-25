// Guarded service worker registration.
// Refuses to register in Lovable preview/dev/iframe contexts per PWA skill.

const SW_URL = "/sw.js";

function isRefusedContext(): { refused: boolean; reason?: string } {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { refused: true, reason: "no-window" };
  }
  if (!("serviceWorker" in navigator)) {
    return { refused: true, reason: "unsupported" };
  }
  if (!import.meta.env.PROD) {
    return { refused: true, reason: "dev" };
  }
  try {
    if (window.self !== window.top) return { refused: true, reason: "iframe" };
  } catch {
    return { refused: true, reason: "iframe" };
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return { refused: true, reason: "lovable-preview" };
  }
  if (new URLSearchParams(window.location.search).get("sw") === "off") {
    return { refused: true, reason: "kill-switch" };
  }
  return { refused: false };
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}

export function registerPWA() {
  const ctx = isRefusedContext();
  if (ctx.refused) {
    void unregisterMatching();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch((err) => {
      console.warn("[pwa] service worker registration failed", err);
    });
  });
}