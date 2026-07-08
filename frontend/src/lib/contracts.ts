/**
 * contracts.ts — Contract interaction helpers for SourceChain
 *
 * Uses genlayer-js GenLayer-specific API:
 *  - client.simulateWriteContract({ address, functionName, args }) → tx hash
 *  - client.readContract({ address, functionName, args })           → result
 *
 * No ABI required — GenLayer encodes calls via RLP, not ABI.
 */

import { getClient } from './genlayer';

// ── Contract Addresses (from .env.local) ─────────────────────────────────────
export const REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || ''
) as `0x${string}`;

export const TREASURY_ADDRESS = (
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS || ''
) as `0x${string}`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ArticleStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CHALLENGED' | 'NOT_FOUND';

export interface VerificationResult {
  source_accuracy: number;
  context_integrity: boolean;
  ai_generated_risk: number;
  verdict: 'VERIFIED' | 'REJECTED';
  reason: string;
  issues_found: string[];
  sources_checked?: number;
  sources_ok?: number;
  challenge?: {
    challenger_address: string;
    evidence_url: string;
    challenge_result: {
      challenge_verdict: 'CHALLENGE_UPHELD' | 'CHALLENGE_REJECTED';
      evidence_credible: boolean;
      new_issues_found: string[];
      reason: string;
      confidence: number;
    };
  };
}

export interface ArticleVerification {
  article_id: string;
  status: ArticleStatus;
  article_title: string;
  article_hash?: string;
  author_address: string;
  verified: boolean;
  verification: VerificationResult | null;
}

export interface ArticleSubmission {
  article_id: string;
  article_hash: string;
  article_title: string;
  article_text: string;
  source_urls: string[];
  author_address: string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function parseJsonResult<T>(raw: unknown): T {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as T;
  }
  return raw as T;
}

export function generateArticleId(title: string, author: string): string {
  const base = `${title}-${author}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  return `art-${Math.abs(hash).toString(36)}`;
}

export async function hashArticle(text: string): Promise<string> {
  if (typeof window === 'undefined') return `sha256:${Date.now()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hashHex}`;
}

// ── Helper: call GenLayer contract write ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function glWrite(functionName: string, address: `0x${string}`, args: unknown[]): Promise<string> {
  const client = getClient();
  // simulateWriteContract is GenLayer's own write method (no ABI required)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (client as any).simulateWriteContract({
    address,
    functionName,
    args,
  });
  // Returns hash string
  return result as string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function glRead(functionName: string, address: `0x${string}`, args: unknown[]): Promise<unknown> {
  const client = getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (client as any).readContract({
    address,
    functionName,
    args,
  });
  return result;
}

// ── Registry Contract Methods ─────────────────────────────────────────────────

export async function submitArticle(submission: ArticleSubmission): Promise<string> {
  if (!REGISTRY_ADDRESS) throw new Error('Registry contract not configured. Set NEXT_PUBLIC_REGISTRY_ADDRESS in .env.local');

  return glWrite('submit_article', REGISTRY_ADDRESS, [
    submission.article_id,
    submission.article_hash,
    submission.article_title,
    submission.article_text,
    JSON.stringify(submission.source_urls),
    submission.author_address,
  ]);
}

export async function verifyArticle(articleId: string): Promise<string> {
  if (!REGISTRY_ADDRESS) throw new Error('Registry contract not configured');
  return glWrite('verify_article', REGISTRY_ADDRESS, [articleId]);
}

export async function getVerification(articleId: string): Promise<ArticleVerification> {
  if (!REGISTRY_ADDRESS) throw new Error('Registry contract not configured');
  const result = await glRead('get_verification', REGISTRY_ADDRESS, [articleId]);
  return parseJsonResult<ArticleVerification>(result);
}

export async function getAllVerified(): Promise<string[]> {
  if (!REGISTRY_ADDRESS) throw new Error('Registry contract not configured');
  const result = await glRead('get_all_verified', REGISTRY_ADDRESS, []);
  return parseJsonResult<string[]>(result);
}

export async function getArticleStatus(articleId: string): Promise<ArticleStatus> {
  if (!REGISTRY_ADDRESS) throw new Error('Registry contract not configured');
  const result = await glRead('get_article_status', REGISTRY_ADDRESS, [articleId]);
  return (result as string) as ArticleStatus;
}

export async function challengeArticle(
  articleId: string,
  challengerAddress: string,
  evidenceUrl: string
): Promise<string> {
  if (!REGISTRY_ADDRESS) throw new Error('Registry contract not configured');
  return glWrite('challenge_article', REGISTRY_ADDRESS, [articleId, challengerAddress, evidenceUrl]);
}

export async function getSubmissionCount(): Promise<number> {
  if (!REGISTRY_ADDRESS) return 0;
  const result = await glRead('get_submission_count', REGISTRY_ADDRESS, []);
  return Number(result);
}

// ── Treasury Contract Methods ─────────────────────────────────────────────────

export async function depositStake(authorAddress: string, amount: number): Promise<string> {
  if (!TREASURY_ADDRESS) throw new Error('Treasury contract not configured');
  return glWrite('deposit_stake', TREASURY_ADDRESS, [authorAddress, amount]);
}

export async function getTreasuryStats(): Promise<{
  reward_pool: number;
  submission_fee: number;
  slash_percentage: number;
  total_slashes: number;
  total_rewards_distributed: number;
}> {
  if (!TREASURY_ADDRESS) {
    return {
      reward_pool: 0,
      submission_fee: 1_000_000,
      slash_percentage: 50,
      total_slashes: 0,
      total_rewards_distributed: 0,
    };
  }
  const result = await glRead('get_treasury_stats', TREASURY_ADDRESS, []);
  return parseJsonResult(result);
}
