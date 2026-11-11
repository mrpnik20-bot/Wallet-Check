export function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatAmount(value, max = 6) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(Number(value) || 0);
}

export function shortAddress(address = "", head = 8, tail = 6) {
  if (!address) return "";
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function formatTxTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function changeLabel(change) {
  const value = Number(change) || 0;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}