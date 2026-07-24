# SourceChain

Verifiable journalism and decentralized news fact-checking on GenLayer.

SourceChain uses GenLayer Intelligent Contracts to autonomously fetch live news source URLs, analyze citation semantics using LLMs, detect AI-generated fake content, and record immutable verification verdicts on-chain without trusting central media authorities.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────┐
│  Journalist     │     │  GenLayer Leader     │     │  Validator Consensus        │     │  On-Chain State │
│                 │     │                      │     │                             │     │                 │
│ Submit Article  │────>│ gl.nondet.web.render │────>│ Multi-Validator LLM Check   │────>│ Store Immutable │
│ + Citation URLs │     │ + LLM Fact-Checking  │     │ Accuracy & Risk Scoring     │     │ Verdict & Feed  │
└─────────────────┘     └──────────────────────┘     └─────────────────────────────┘     └─────────────────┘
```

## The Problem

Decentralized journalism faces critical trust and verification bottlenecks:
1. **Rampant Misinformation:** Misinformation spreads 6× faster than corrections, while manual fact-checking takes days or weeks.
2. **AI-Generated Fake News:** Generative models flood news feeds with synthetic stories that pass superficial inspection.
3. **Centralized Fact-Checkers:** Traditional fact-checking agencies are centralized, vulnerable to bias, censorship, and political pressure.
4. **No On-Chain Provenance:** Legacy blockchains cannot read external web pages or evaluate whether an article accurately quotes its sources.

## How It Works

1. **Submit Article:** A journalist submits an article along with up to 3 citation URLs and stakes tokens in the `SourceChainTreasury`.
2. **Live Web Scraping:** GenLayer validators fetch the raw HTML/text of each citation URL directly on-chain using `gl.nondet.web.render()`.
3. **Semantic LLM Fact-Checking:** `gl.nondet.exec_prompt()` evaluates source accuracy, context integrity, and AI generation risk.
4. **Consensus Verdict:** Independent GenLayer validators verify the reasoning and confirm score consistency through `validator_fn`.
5. **On-Chain Settlement:** Verified articles are published to the immutable news feed and author stakes are returned. Fraudulent submissions are rejected and slashed.

## Why GenLayer

- **Direct Web Access On-Chain:** GenLayer contracts fetch and parse live internet URLs (`gl.nondet.web.render`) natively without third-party centralized oracles.
- **On-Chain LLM Reasoning:** Semantic evaluation of article claims against source material via `gl.nondet.exec_prompt`.
- **Multi-Validator Consensus:** Non-deterministic execution (`run_nondet_unsafe`) allows validators to reach objective agreement on subjective content evaluations.
- **Economic Dispute Resolution:** Integrated Treasury contract handles author staking, challenge bonds, and slashing rewards for community-driven integrity.

## Live Deployment

| Contract | Network | Address | Description |
|----------|---------|---------|-------------|
| `SourceChainRegistry.py` | GenLayer Testnet Asimov | `0x9420f93DE811771fC182EcCE03C7a55F90190f43` | Core AI verification & article registry engine |
| `SourceChainTreasury.py` | GenLayer Testnet Asimov | `0x71A672b4C64962b109D96081e7d23dCeeF7c0303` | Staking, challenge escrow, and slashing protocol |

## Architecture & Contract Methods

### `SourceChainRegistry.py`
- `submit_article(title: str, content: str, source_urls: list[str]) -> str`: Submits a new article for verification.
- `verify_article(article_id: str) -> str`: Triggers GenLayer web scraping & LLM consensus verification.
- `get_verification(article_id: str) -> str`: Returns full JSON verification report (accuracy score, risk score, verdict).
- `get_all_verified() -> list[str]`: Fetches array of all VERIFIED article IDs for the public feed.

### `SourceChainTreasury.py`
- `deposit_stake(article_id: str)`: Locks author stake before submission.
- `release_stake(article_id: str)`: Returns stake upon successful verification.
- `slash_and_reward(article_id: str, challenger: str)`: Slashes fraudulent author stake and pays out challenger reward.

## Quick Start

### 1. Install Dependencies
```bash
cd frontend && npm install
```

### 2. Configure Environment
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_REGISTRY_ADDRESS=0x9420f93DE811771fC182EcCE03C7a55F90190f43
NEXT_PUBLIC_TREASURY_ADDRESS=0x71A672b4C64962b109D96081e7d23dCeeF7c0303
```

### 3. Run Frontend
```bash
npm run dev
```

### 4. Run Contract Audit & Tests
```bash
python scripts/audit_compliance.py
pytest
```
