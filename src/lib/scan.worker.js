// Derives wallet addresses off the main thread so very large lists stay responsive.
import { deriveScanAddresses } from "./walletKeys";

self.onmessage = async (event) => {
  const { id, phrases } = event.data || {};
  const addresses = [];
  for (const phrase of phrases || []) {
    try {
      addresses.push(await deriveScanAddresses(phrase));
    } catch {
      addresses.push(null);
    }
  }
  self.postMessage({ id, addresses });
};