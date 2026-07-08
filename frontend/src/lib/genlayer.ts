/**
 * genlayer.ts — GenLayer JS client setup
 * Centralizes client creation and wallet management using correct genlayer-js API
 */

import { createClient, createAccount, chains } from 'genlayer-js';

// ── Client Singleton ─────────────────────────────────────────────────────────
let _client: ReturnType<typeof createClient> | null = null;
let _walletAddress: string | null = null;

export function getClient() {
  if (!_client) {
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

// ── Wallet connect (demo account for testnet) ────────────────────────────────
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined') return '0x0000000000000000000000000000000000000000';

  const stored = localStorage.getItem('sc_wallet');
  if (stored) {
    _walletAddress = stored;
    return stored;
  }

  // For testnet demo: create a fresh account
  const account = createAccount();
  _walletAddress = (account as { address: string }).address;

  localStorage.setItem('sc_wallet', _walletAddress);
  // Store private key for signing transactions
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

// ── TX Explorer Link ─────────────────────────────────────────────────────────
export function getTxExplorerUrl(txHash: string): string {
  return `https://studio.genlayer.com/tx/${txHash}`;
}

export function getNetworkName(): string {
  return 'testnet_asimov';
}
