/**
 * genlayer.ts — GenLayer JS client setup
 * Production-ready client connecting to GenLayer Testnet Asimov
 * Contract: 0x9420f93DE811771fC182EcCE03C7a55F90190f43
 */

import { createClient, createAccount, chains } from 'genlayer-js';

// ── Client Singleton ─────────────────────────────────────────────────────────
let _client: ReturnType<typeof createClient> | null = null;
let _walletAddress: string | null = null;

export function getClient() {
  if (!_client) {
    // Connect to GenLayer Testnet Asimov where SourceChain is deployed
    _client = createClient({
      chain: chains.testnetAsimov,
    });
  }
  return _client;
}

export function getWalletAddress(): string | null {
  return _walletAddress;
}

export function setWalletAddress(address: string | null) {
  _walletAddress = address;
}

// ── Wallet connect ────────────────────────────────────────────────────────────
// Creates or restores a local GenLayer account stored in browser localStorage.
// For production: integrate MetaMask/WalletConnect by passing provider to createClient.
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined') return '0x0000000000000000000000000000000000000000';

  const stored = localStorage.getItem('sc_wallet');
  if (stored) {
    _walletAddress = stored;
    return stored;
  }

  // Create a fresh keypair for this browser session
  const account = createAccount();
  _walletAddress = (account as { address: string }).address;

  localStorage.setItem('sc_wallet', _walletAddress);

  // Persist private key so the same account is reused across refreshes
  const anyAccount = account as unknown as Record<string, string>;
  if (anyAccount.privateKey) {
    localStorage.setItem('sc_pk', anyAccount.privateKey);
  }

  return _walletAddress;
}

export function disconnectWallet() {
  _walletAddress = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sc_wallet');
    localStorage.removeItem('sc_pk');
  }
}

export function loadStoredWallet(): string | null {
  if (typeof window === 'undefined') return null;
  const addr = localStorage.getItem('sc_wallet');
  if (addr) _walletAddress = addr;
  return addr;
}

// ── Address Helpers ──────────────────────────────────────────────────────────
export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// ── Explorer Links ────────────────────────────────────────────────────────────
export function getTxExplorerUrl(txHash: string): string {
  return `https://studio.genlayer.com/tx/${txHash}`;
}

export function getContractExplorerUrl(address: string): string {
  return `https://studio.genlayer.com/contracts/${address}`;
}

export function getNetworkName(): string {
  return 'GenLayer Testnet Asimov';
}
