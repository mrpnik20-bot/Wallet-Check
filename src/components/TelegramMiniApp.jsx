import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { applySafeArea, waitForTelegram } from "@/lib/telegramMiniApp";

const HOME = "/";

// Opens the app as a Telegram Mini App in full screen, keeps it stretched and
// wires the native back button for every screen that isn't the wallet home.
export default function TelegramMiniApp() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tg, setTg] = useState(null);

  useEffect(() => {
    let active = true;
    waitForTelegram().then((app) => {
      if (active && app) setTg(app);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor?.("#0B1220");
      tg.setBackgroundColor?.("#0B1220");
      tg.requestFullscreen?.();
      tg.disableVerticalSwipes?.();
    } catch {
      // older Telegram clients only support expand()
    }
    applySafeArea(tg);

    const sync = () => applySafeArea(tg);
    tg.onEvent?.("viewportChanged", sync);
    tg.onEvent?.("safeAreaChanged", sync);
    tg.onEvent?.("contentSafeAreaChanged", sync);
    tg.onEvent?.("fullscreenChanged", sync);
    return () => {
      tg.offEvent?.("viewportChanged", sync);
      tg.offEvent?.("safeAreaChanged", sync);
      tg.offEvent?.("contentSafeAreaChanged", sync);
      tg.offEvent?.("fullscreenChanged", sync);
    };
  }, [tg]);

  useEffect(() => {
    const back = tg?.BackButton;
    if (!back) return;

    if (pathname === HOME) {
      back.hide();
      return;
    }

    const onBack = () => {
      if (window.history.length > 1) window.history.back();
      else navigate({ to: HOME });
    };

    back.onClick(onBack);
    back.show();
    return () => {
      back.offClick(onBack);
      back.hide();
    };
  }, [tg, pathname, navigate]);

  return null;
}