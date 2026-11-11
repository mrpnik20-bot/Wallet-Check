// Chains the wallet can read live balances for, with their public explorers.
export const CHAINS = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    color: "#F7931A",
    decimals: 8,
    network: "Bitcoin",
    explorer: "https://mempool.space/address/",
    pattern: /^(bc1[a-zA-HJ-NP-Z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    color: "#7C8CF8",
    decimals: 6,
    network: "Ethereum",
    explorer: "https://etherscan.io/address/",
    pattern: /^0x[a-fA-F0-9]{40}$/,
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    color: "#19E39B",
    decimals: 6,
    network: "Solana",
    explorer: "https://solscan.io/account/",
    pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  },
  {
    id: "bnb",
    name: "BNB Chain",
    symbol: "BNB",
    color: "#F3BA2F",
    decimals: 6,
    network: "BNB Smart Chain",
    explorer: "https://bscscan.com/address/",
    pattern: /^0x[a-fA-F0-9]{40}$/,
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "POL",
    color: "#8B6BE8",
    decimals: 6,
    network: "Polygon PoS",
    explorer: "https://polygonscan.com/address/",
    pattern: /^0x[a-fA-F0-9]{40}$/,
  },
  {
    id: "avalanche",
    name: "Avalanche",
    symbol: "AVAX",
    color: "#E84142",
    decimals: 6,
    network: "Avalanche C-Chain",
    explorer: "https://snowtrace.io/address/",
    pattern: /^0x[a-fA-F0-9]{40}$/,
  },
  {
    id: "tron",
    name: "Tron",
    symbol: "TRX",
    color: "#FF5A5A",
    decimals: 6,
    network: "Tron",
    explorer: "https://tronscan.org/#/address/",
    pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  },
  {
    id: "litecoin",
    name: "Litecoin",
    symbol: "LTC",
    color: "#C7CBD1",
    decimals: 8,
    network: "Litecoin",
    explorer: "https://litecoinspace.org/address/",
    pattern: /^(ltc1[a-z0-9]{25,60}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    color: "#D6B24A",
    decimals: 6,
    network: "Dogecoin",
    explorer: "https://dogechain.info/address/",
    pattern: /^D[1-9A-HJ-NP-Za-km-z]{33}$/,
  },
  {
    id: "ripple",
    name: "XRP",
    symbol: "XRP",
    color: "#3FC98A",
    decimals: 6,
    network: "XRP Ledger",
    explorer: "https://xrpscan.com/account/",
    pattern: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
  },
];

// Extra chains the bulk scanner reads. They are kept out of the wallet dashboard list.
export const SCAN_ONLY_CHAINS = [
  {
    id: "base",
    name: "Base",
    symbol: "ETH",
    color: "#0052FF",
    decimals: 6,
    network: "Base",
    explorer: "https://basescan.org/address/",
    pattern: /^0x[a-fA-F0-9]{40}$/,
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ETH",
    color: "#28A0F0",
    decimals: 6,
    network: "Arbitrum One",
    explorer: "https://arbiscan.io/address/",
    pattern: /^0x[a-fA-F0-9]{40}$/,
  },
  {
    id: "ton",
    name: "TON",
    symbol: "GRAM",
    color: "#0098EA",
    decimals: 6,
    network: "The Open Network",
    explorer: "https://tonviewer.com/",
    pattern: /^(pk:)?[0-9a-zA-Z,:]{20,200}$/,
  },
];

const ALL_CHAINS = [...CHAINS, ...SCAN_ONLY_CHAINS];

export const getChain = (id) => ALL_CHAINS.find((chain) => chain.id === id) || null;

export function isValidAddress(chainId, value) {
  const chain = getChain(chainId);
  if (!chain || !value) return false;
  return chain.pattern.test(value.trim());
}