import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Generated in the browser from the address itself — nothing is fetched.
export default function QrCode({ value, size = 208, className }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!value) {
      setSrc(null);
      return () => {};
    }
    QRCode.toDataURL(value, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: "M",
      color: { dark: "#05080f", light: "#ffffff" },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [value]);

  if (!src) {
    return <div className="animate-pulse rounded-xl bg-white/10" style={{ width: size, height: size }} />;
  }

  return <img src={src} alt="Wallet address QR code" width={size} height={size} className={className} />;
}