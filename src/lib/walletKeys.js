// Real key derivation. Everything here runs in the browser only: the seed phrase
// is decrypted locally and private keys never leave the device.
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import * as btc from "@scure/btc-signer";
import { base58 } from "@scure/base";
import { ed25519 } from "@noble/curves/ed25519";
import { Wallet, getBytes, keccak256, sha256 } from "ethers";

const EVM_CHAINS = new Set(["ethereum", "bnb", "polygon", "avalanche"]);

export const EVM_CHAIN_IDS = { ethereum: 1, bnb: 56, polygon: 137, avalanche: 43114 };

const toHex = (bytes) => "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) =>
  Uint8Array.from(String(hex).replace(/^0x/, "").match(/.{1,2}/g) || [], (byte) => parseInt(byte, 16));

const normalize = (phrase) => String(phrase).trim().toLowerCase().replace(/\s+/g, " ");
const seedOf = (phrase) => mnemonicToSeedSync(normalize(phrase));

export const signKind = (chainId) =>
  EVM_CHAINS.has(chainId) ? "evm" : chainId === "bitcoin" ? "btc" : chainId === "solana" ? "sol" : null;

const evmNode = (seed) => HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0");
const btcNode = (seed) => HDKey.fromMasterSeed(seed).derive("m/84'/0'/0'/0/0");

async function hmac512(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
}

// SLIP-0010 ed25519 derivation, the scheme Phantom/Solflare use for m/44'/501'/0'/0'.
async function ed25519Secret(seed, path) {
  let block = await hmac512(new TextEncoder().encode("ed25519 seed"), seed);
  let key = block.slice(0, 32);
  let chainCode = block.slice(32);
  for (const index of path) {
    const data = new Uint8Array(37);
    new DataView(data.buffer).setUint32(33, index + 0x80000000);
    data.set(key, 1);
    block = await hmac512(chainCode, data);
    key = block.slice(0, 32);
    chainCode = block.slice(32);
  }
  return key;
}

const solanaSecret = (seed) => ed25519Secret(seed, [44, 501, 0, 0]);

// TON wallets use two common key layouts, so both are resolved when scanning.
const TON_PATHS = [
  [44, 607, 0],
  [44, 607, 0, 0, 0],
];

export async function deriveAddresses(phrase) {
  const seed = seedOf(phrase);
  const evm = new Wallet(toHex(evmNode(seed).privateKey)).address;
  const payment = btc.p2wpkh(btcNode(seed).publicKey, btc.NETWORK);
  const solana = base58.encode(ed25519.getPublicKey(await solanaSecret(seed)));
  return { ethereum: evm, bnb: evm, polygon: evm, avalanche: evm, bitcoin: payment.address, solana };
}

export async function signEvmTransfer(phrase, { chainId, to, valueWei, nonce, gasPrice, gasLimit }) {
  const wallet = new Wallet(toHex(evmNode(seedOf(phrase)).privateKey));
  return wallet.signTransaction({
    type: 0,
    chainId: EVM_CHAIN_IDS[chainId],
    nonce,
    gasPrice: BigInt(gasPrice),
    gasLimit: BigInt(gasLimit),
    to: to.trim(),
    value: BigInt(valueWei),
  });
}

// BIP84 native segwit (bc1…): one PSBT, all funded UTXOs spent, change back to us.
export function signBitcoinTransfer(phrase, { utxos, to, amountSats, changeSats }) {
  const node = btcNode(seedOf(phrase));
  const payment = btc.p2wpkh(node.publicKey, btc.NETWORK);
  const tx = new btc.Transaction();
  for (const utxo of utxos) {
    tx.addInput({
      txid: fromHex(utxo.txid),
      index: utxo.vout,
      witnessUtxo: { script: payment.script, amount: BigInt(utxo.value) },
    });
  }
  tx.addOutputAddress(to.trim(), BigInt(amountSats), btc.NETWORK);
  if (changeSats > 546) tx.addOutputAddress(payment.address, BigInt(changeSats), btc.NETWORK);
  tx.sign(node.privateKey);
  tx.finalize();
  return Array.from(tx.extract(), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const SYSTEM_PROGRAM = base58.decode("11111111111111111111111111111111");

function concat(...arrays) {
  const total = arrays.reduce((sum, item) => sum + item.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const item of arrays) {
    out.set(item, offset);
    offset += item.length;
  }
  return out;
}

function compact(value) {
  const out = [];
  let rest = value;
  while (rest >= 0x80) {
    out.push((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  out.push(rest);
  return Uint8Array.from(out);
}

const u32le = (value) => Uint8Array.from([value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff]);
const u64le = (value) => {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
  return bytes;
};

// A plain SOL transfer: one System Program instruction, signed with ed25519.
export async function signSolanaTransfer(phrase, { to, lamports, blockhash }) {
  const secret = await solanaSecret(seedOf(phrase));
  const from = ed25519.getPublicKey(secret);
  const data = concat(u32le(2), u64le(lamports));
  const message = concat(
    Uint8Array.from([1, 0, 1]),
    compact(3),
    from,
    base58.decode(to.trim()),
    SYSTEM_PROGRAM,
    base58.decode(blockhash),
    compact(1),
    Uint8Array.from([2]),
    compact(2),
    Uint8Array.from([0, 1]),
    compact(data.length),
    data
  );
  const signature = ed25519.sign(message, secret);
  return btoa(String.fromCharCode(...concat(compact(1), signature, message)));
}

// Every chain the bulk scanner can read a balance for, derived from one phrase.
const LTC_NETWORK = { bech32: "ltc", pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 };
const DOGE_NETWORK = { pubKeyHash: 0x1e, scriptHash: 0x16, wif: 0x9e };

function base58Check(bytes) {
  const checksum = getBytes(sha256(getBytes(sha256(bytes)))).slice(0, 4);
  return base58.encode(concat(bytes, checksum));
}

function tronAddress(seed) {
  const wallet = new Wallet(toHex(HDKey.fromMasterSeed(seed).derive("m/44'/195'/0'/0/0").privateKey));
  const hash = keccak256("0x" + wallet.signingKey.publicKey.slice(4));
  return base58Check(fromHex("41" + hash.slice(-40)));
}

export async function deriveScanAddresses(phrase) {
  const seed = seedOf(phrase);
  const master = HDKey.fromMasterSeed(seed);
  const evm = new Wallet(toHex(master.derive("m/44'/60'/0'/0/0").privateKey)).address;
  const solana = base58.encode(ed25519.getPublicKey(await solanaSecret(seed)));
  const tonKeys = await Promise.all(
    TON_PATHS.map(async (path) => toHex(ed25519.getPublicKey(await ed25519Secret(seed, path))).slice(2))
  );
  return {
    bitcoin: btc.p2wpkh(btcNode(seed).publicKey, btc.NETWORK).address,
    ethereum: evm,
    bnb: evm,
    polygon: evm,
    avalanche: evm,
    base: evm,
    arbitrum: evm,
    optimism: evm,
    zksync: evm,
    linea: evm,
    scroll: evm,
    gnosis: evm,
    celo: evm,
    mantle: evm,
    blast: evm,
    solana,
    ton: `pk:${tonKeys.join(",")}`,
    tron: tronAddress(seed),
    litecoin: btc.p2pkh(master.derive("m/44'/2'/0'/0/0").publicKey, LTC_NETWORK).address,
    dogecoin: btc.p2pkh(master.derive("m/44'/3'/0'/0/0").publicKey, DOGE_NETWORK).address,
  };
}