// Telegram Mini App bridge: full screen launch, safe-area insets and the native back button.

export function getTelegramWebApp() {
  if (typeof window === "undefined") return null;
  const tg = window.Telegram?.WebApp;
  return tg && typeof tg.ready === "function" ? tg : null;
}

// telegram-web-app.js loads next to the app bundle, so wait briefly for it to appear.
export function waitForTelegram(timeout = 3000) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    const started = Date.now();
    const check = () => {
      const tg = getTelegramWebApp();
      if (tg) return resolve(tg);
      if (Date.now() - started > timeout) return resolve(null);
      setTimeout(check, 80);
    };
    check();
  });
}

// Telegram reports its own safe areas once the app fills the screen; feed them to CSS
// so the header and bottom navigation stay clear of Telegram's own controls.
export function applySafeArea(tg) {
  if (typeof document === "undefined" || !tg) return;
  const area = tg.safeAreaInset || {};
  const content = tg.contentSafeAreaInset || {};
  const { style } = document.documentElement;
  style.setProperty("--tg-inset-top", `${(area.top || 0) + (content.top || 0)}px`);
  style.setProperty("--tg-inset-bottom", `${(area.bottom || 0) + (content.bottom || 0)}px`);
  style.setProperty("--tg-inset-left", `${(area.left || 0) + (content.left || 0)}px`);
  style.setProperty("--tg-inset-right", `${(area.right || 0) + (content.right || 0)}px`);
}