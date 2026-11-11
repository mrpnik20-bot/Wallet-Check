// Base-unit maths for sending. Display precision lives in chains.js; the units
// below are what the chains themselves use.
export const UNIT_DECIMALS = {
  ethereum: 18,
  bnb: 18,
  polygon: 18,
  avalanche: 18,
  bitcoin: 8,
  solana: 9,
};

const dec = (chainId) => UNIT_DECIMALS[chainId] ?? 18;

export function parseUnits(chainId, value) {
  const text = String(value ?? "").trim();
  if (!/^\d*\.?\d*$/.test(text) || text === "" || text === ".") return 0n;
  const [whole, fraction = ""] = text.split(".");
  const digits = (fraction + "0".repeat(dec(chainId))).slice(0, dec(chainId));
  return BigInt(whole || "0") * 10n ** BigInt(dec(chainId)) + BigInt(digits || "0");
}

export function formatUnits(chainId, base) {
  const d = dec(chainId);
  const value = BigInt(base ?? 0);
  const whole = value / 10n ** BigInt(d);
  const fraction = (value % 10n ** BigInt(d)).toString().padStart(d, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

export const FEE_DECIMALS = { eth: 18, btc: 8, sol: 9 };