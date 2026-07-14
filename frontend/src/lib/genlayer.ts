/**
 * genlayer.ts — GenLayer JS client setup
 * Production-ready client connecting to GenLayer Testnet Asimov
 * Contract: 0x9420f93DE811771fC182EcCE03C7a55F90190f43
 */

import { createClient, chains } from 'genlayer-js';

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on(event: 'accountsChanged', listener: (accounts: string[]) => void): void;
  on(event: 'chainChanged', listener: (chainId: string) => void): void;
  removeListener(event: 'accountsChanged', listener: (accounts: string[]) => void): void;
  removeListener(event: 'chainChanged', listener: (chainId: string) => void): void;
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

// ── Client Singleton ─────────────────────────────────────────────────────────
let _walletAddress: string | null = null;

export function getClient() {
  if (typeof window !== 'undefined' && window.ethereum) {
    const address = getWalletAddress();
    if (address) {
      return createClient({
        chain: chains.testnetAsimov,
        account: address as `0x${string}`,
        provider: window.ethereum,
      });
    }
  }
  return createClient({
    chain: chains.testnetAsimov,
  });
}

/** A provider-free client for reads and transaction polling. */
export function getReadClient() {
  return createClient({ chain: chains.testnetAsimov });
}

/**
 * Return a client whose account is currently authorised by the injected wallet.
 * A localStorage address is only a UI hint; it must never be treated as proof that
 * the user still controls that account.
 */
export async function getAuthenticatedWriteClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No compatible browser wallet detected.');
  }

  const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[];
  const address = accounts?.[0];
  if (!address) {
    throw new Error('Wallet authorization expired. Please reconnect your wallet.');
  }

  _walletAddress = address;
  localStorage.setItem('sc_wallet', address);
  return createClient({
    chain: chains.testnetAsimov,
    account: address as `0x${string}`,
    provider: window.ethereum,
  });
}

export function getWalletAddress(): string | null {
  return _walletAddress;
}

export function setWalletAddress(address: string | null) {
  _walletAddress = address;
}

// ── Wallet connect ────────────────────────────────────────────────────────────
// Connects to MetaMask or another injected EIP-1193 browser wallet.
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined') return '0x0000000000000000000000000000000000000000';

  if (!window.ethereum) {
    throw new Error('No Ethereum wallet extension detected. Please install MetaMask or another compatible wallet.');
  }

  // Request accounts from the browser extension
  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found in your wallet extension.');
  }

  _walletAddress = accounts[0];
  localStorage.setItem('sc_wallet', _walletAddress);
  localStorage.removeItem('sc_pk'); // Clear any legacy local keypair

  // Try to switch MetaMask to GenLayer Testnet Asimov network
  const chain = chains.testnetAsimov;
  const chainIdHex = `0x${chain.id.toString(16)}`;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: unknown) {
    const err = switchError as { code?: number };
    // Code 4902 indicates the chain has not been added to MetaMask
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: chain.name,
              rpcUrls: chain.rpcUrls.default.http,
              nativeCurrency: chain.nativeCurrency,
              blockExplorers: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
            },
          ],
        });
      } catch (addError) {
        console.error('Failed to add GenLayer network to wallet:', addError);
      }
    } else {
      console.error('Failed to switch to GenLayer network:', switchError);
    }
  }

  return _walletAddress;
}

export async function fundAccount(address: string, amount: number = 10): Promise<string> {
  const client = getClient();
  try {
    const txHash = await (client as unknown as {
      request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
    }).request({
      method: 'sim_fundAccount',
      params: [address as `0x${string}`, amount],
    });
    return txHash as string;
  } catch (error) {
    console.error('Funding failed:', error);
    throw error;
  }
}

export async function disconnectWallet(): Promise<void> {
  _walletAddress = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sc_wallet');
    localStorage.removeItem('sc_pk');
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch (err) {
        console.warn('wallet_revokePermissions not supported or rejected:', err);
      }
    }
  }
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
