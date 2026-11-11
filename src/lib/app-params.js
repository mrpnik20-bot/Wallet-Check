import { getAccessToken } from "@base44/sdk";

const isBrowser = typeof window !== "undefined";

const isClearAccessTokenRequested = () =>
  isBrowser && new URLSearchParams(window.location.search).get("clear_access_token") === "true";

const clearStoredAccessToken = () => {
  window.localStorage.removeItem("base44_access_token");
  window.localStorage.removeItem("token");
};

// This app's own identifier, used when a build has no injected VITE_BASE44_APP_ID
// (for example the Vercel build in vite.config.vercel.js).
const FALLBACK_APP_ID = "6af411283a0f29b7311a6fc3";

export function getAppParams() {
  if (isClearAccessTokenRequested()) clearStoredAccessToken();
  return {
    appId: import.meta.env.VITE_BASE44_APP_ID || FALLBACK_APP_ID,
    token: isBrowser ? getAccessToken() : null,
    functionsVersion: (isBrowser && new URLSearchParams(window.location.search).get("functions_version")?.trim()) || import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
    appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
  };
}