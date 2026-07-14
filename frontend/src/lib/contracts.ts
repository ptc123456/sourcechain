/**
 * contracts.ts — Contract interaction helpers for SourceChain
 *
 * Uses genlayer-js GenLayer-specific API:
 *  - client.simulateWriteContract({ address, functionName, args }) → tx hash
 *  - client.readContract({ address, functionName, args })           → result
 *
 * No ABI required — GenLayer encodes calls via RLP, not ABI.
 */

import { getClient, getAccount, getWalletAddress } from './genlayer';

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

// ── Demo Mode Mock Storage & Data ─────────────────────────────────────────────

const MOCK_ARTICLES_FALLBACK: ArticleVerification[] = [
  {
    article_id: 'demo-001',
    article_title: 'Record Arctic Ice Melt Confirmed by Multiple Research Institutions',
    status: 'VERIFIED',
    author_address: '0xDemoAuthor123456789ABCDEF',
    verified: true,
    article_hash: 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    verification: {
      source_accuracy: 0.92,
      context_integrity: true,
      ai_generated_risk: 0.15,
      verdict: 'VERIFIED',
      reason: 'All cited facts confirmed in NASA and NSIDC sources. Clear human authorship detected.',
      issues_found: [],
      sources_checked: 3,
      sources_ok: 3,
    },
  },
  {
    article_id: 'demo-002',
    article_title: 'New COVID Variant Study: What the Data Really Shows',
    status: 'VERIFIED',
    author_address: '0xDemoAuthor987654321FEDCBA',
    verified: true,
    article_hash: 'sha256:b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    verification: {
      source_accuracy: 0.88,
      context_integrity: true,
      ai_generated_risk: 0.22,
      verdict: 'VERIFIED',
      reason: 'WHO and peer-reviewed sources support all key claims. Some speculative framing noted.',
      issues_found: ['Minor speculative framing in conclusion section'],
      sources_checked: 2,
      sources_ok: 2,
    },
  },
  {
    article_id: 'demo-003',
    article_title: 'Tech Giant Earnings Report: Breaking Down the Actual Numbers',
    status: 'VERIFIED',
    author_address: '0xDemoAuthor555666777888ABC',
    verified: true,
    article_hash: 'sha256:c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    verification: {
      source_accuracy: 0.95,
      context_integrity: true,
      ai_generated_risk: 0.08,
      verdict: 'VERIFIED',
      reason: 'Official SEC filings and company press releases confirm all financial figures.',
      issues_found: [],
      sources_checked: 3,
      sources_ok: 3,
    },
  },
];

function getDemoArticles(): ArticleVerification[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('sc_demo_articles');
  return stored ? JSON.parse(stored) : [];
}

function saveDemoArticle(article: ArticleVerification) {
  if (typeof window === 'undefined') return;
  const articles = getDemoArticles();
  const filtered = articles.filter(a => a.article_id !== article.article_id);
  localStorage.setItem('sc_demo_articles', JSON.stringify([...filtered, article]));
}

// ── Helper: call GenLayer contract write ──────────────────────────────────────
async function glWrite(functionName: string, address: `0x${string}`, args: unknown[]): Promise<string> {
  if (!address) {
    console.warn(`[Demo Mode] Simulating write: ${functionName}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const randomHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `0x${randomHash}`;
  }

  const client = getClient();
  const walletAddress = getWalletAddress();
  if (!walletAddress) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  // Call writeContract (authenticated contract write via provider)
  const txHash = await (client as any).writeContract({
    account: walletAddress as `0x${string}`,
    address,
    functionName,
    args,
    value: 0n,
  });

  // Wait for transaction confirmation
  const receipt = await (client as any).waitForTransactionReceipt({
    hash: txHash,
    status: 'FINALIZED',
  });

  // Check receipt for execution failures
  if (
    receipt.status === 'CANCELED' ||
    receipt.status === 'LEADER_TIMEOUT' ||
    receipt.status === 'VALIDATORS_TIMEOUT' ||
    receipt.resultName === 'FAILURE' ||
    receipt.txExecutionResultName === 'FINISHED_WITH_ERROR'
  ) {
    const errorMsg = receipt.data?.error || `Transaction failed with status: ${receipt.statusName || receipt.status}`;
    throw new Error(errorMsg);
  }

  return txHash;
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
  if (!REGISTRY_ADDRESS) {
    const mockArticle: ArticleVerification = {
      article_id: submission.article_id,
      article_title: submission.article_title,
      status: 'PENDING',
      author_address: submission.author_address,
      verified: false,
      article_hash: submission.article_hash,
      verification: null,
    };
    saveDemoArticle(mockArticle);
    return glWrite('submit_article', '' as `0x${string}`, []);
  }

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
  if (!REGISTRY_ADDRESS) {
    const demoArticles = getDemoArticles();
    const found = demoArticles.find(a => a.article_id === articleId);
    if (found) {
      // Custom verdict rule: title containing 'fake' or 'reject' fails
      const isRejected = found.article_title.toLowerCase().includes('fake') || 
                         found.article_title.toLowerCase().includes('reject');
      
      const verdict = isRejected ? 'REJECTED' : 'VERIFIED';
      found.status = verdict;
      found.verified = verdict === 'VERIFIED';
      found.verification = {
        source_accuracy: isRejected ? 0.35 : 0.94,
        context_integrity: !isRejected,
        ai_generated_risk: isRejected ? 0.85 : 0.12,
        verdict: verdict,
        reason: isRejected 
          ? 'Failed citation verification. Multiple sources contradict the core claims of this article.' 
          : 'All cited facts verified successfully against live news outlets. Low AI footprint detected.',
        issues_found: isRejected ? ['Core claims contradicted by NASA and Reuters archives', 'Plagiarism risk detected'] : [],
        sources_checked: 3,
        sources_ok: isRejected ? 1 : 3,
      };
      saveDemoArticle(found);
    }
    return glWrite('verify_article', '' as `0x${string}`, []);
  }

  return glWrite('verify_article', REGISTRY_ADDRESS, [articleId]);
}

export async function getVerification(articleId: string): Promise<ArticleVerification> {
  if (!REGISTRY_ADDRESS) {
    const demoArticles = getDemoArticles();
    const found = demoArticles.find(a => a.article_id === articleId);
    if (found) return found;
    
    const mock = MOCK_ARTICLES_FALLBACK.find(a => a.article_id === articleId);
    if (mock) return mock;

    throw new Error('Article not found (Demo Mode)');
  }

  const result = await glRead('get_verification', REGISTRY_ADDRESS, [articleId]);
  return parseJsonResult<ArticleVerification>(result);
}

export async function getAllVerified(): Promise<string[]> {
  if (!REGISTRY_ADDRESS) {
    const demoArticles = getDemoArticles();
    return [
      ...demoArticles.filter(a => a.status === 'VERIFIED').map(a => a.article_id),
      ...MOCK_ARTICLES_FALLBACK.map(a => a.article_id),
    ];
  }

  const result = await glRead('get_all_verified', REGISTRY_ADDRESS, []);
  return parseJsonResult<string[]>(result);
}

export async function getArticleStatus(articleId: string): Promise<ArticleStatus> {
  if (!REGISTRY_ADDRESS) {
    const demoArticles = getDemoArticles();
    const found = demoArticles.find(a => a.article_id === articleId);
    return found ? found.status : 'NOT_FOUND';
  }

  const result = await glRead('get_article_status', REGISTRY_ADDRESS, [articleId]);
  return (result as string) as ArticleStatus;
}

export async function challengeArticle(
  articleId: string,
  challengerAddress: string,
  evidenceUrl: string
): Promise<string> {
  if (!REGISTRY_ADDRESS) {
    const demoArticles = getDemoArticles();
    const found = demoArticles.find(a => a.article_id === articleId);
    if (found) {
      found.status = 'CHALLENGED';
      found.verified = false;
      found.verification = {
        ...(found.verification || {
          source_accuracy: 0.9,
          context_integrity: true,
          ai_generated_risk: 0.1,
          verdict: 'VERIFIED',
          reason: 'Initial verification successful.',
          issues_found: [],
        }),
        challenge: {
          challenger_address: challengerAddress,
          evidence_url: evidenceUrl,
          challenge_result: {
            challenge_verdict: 'CHALLENGE_UPHELD',
            evidence_credible: true,
            new_issues_found: ['The provided evidence URL clearly refutes the article\'s secondary claims.'],
            reason: 'Evidence credible. The article claims were found to be invalid based on updated evidence.',
            confidence: 0.95,
          }
        }
      };
      saveDemoArticle(found);
    }
    return glWrite('challenge_article', '' as `0x${string}`, []);
  }

  return glWrite('challenge_article', REGISTRY_ADDRESS, [articleId, challengerAddress, evidenceUrl]);
}

export async function getSubmissionCount(): Promise<number> {
  if (!REGISTRY_ADDRESS) {
    const demoArticles = getDemoArticles();
    return MOCK_ARTICLES_FALLBACK.length + demoArticles.length;
  }

  const result = await glRead('get_submission_count', REGISTRY_ADDRESS, []);
  return Number(result);
}

// ── Treasury Contract Methods ─────────────────────────────────────────────────

export async function depositStake(authorAddress: string, amount: number): Promise<string> {
  if (!TREASURY_ADDRESS) {
    return glWrite('deposit_stake', '' as `0x${string}`, []);
  }
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
