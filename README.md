# ⛓ SourceChain — Verifiable Journalism on GenLayer

> **"SourceChain dies without GenLayer — because nothing else can read a live URL on-chain, analyze citation semantics with an LLM, and record an immutable verdict without a trusted third party."**

[![GenLayer](https://img.shields.io/badge/GenLayer-v0.2.16-6366f1)](https://genlayer.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Tests](https://img.shields.io/badge/Tests-70%20passing-10b981)](./tests)
[![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)

---

## 🎯 The Problem

The journalism crisis is structural:

- **Misinformation spreads faster than corrections.** By the time a fact-check is published, fake stories have 6× more shares.
- **AI-generated content floods news feeds.** Detectors are unreliable. Human reviewers can't scale.
- **Existing fact-checkers are centralized** — prone to bias, funding pressure, and latency.
- **No cryptographic proof** that a source URL contained the cited content at publication time.

## 💡 The Solution: SourceChain

SourceChain is a **decentralized article verification dApp** on GenLayer. When a journalist submits an article:

1. **Live URL Fetch** — AI validators fetch each source URL directly from the internet (`gl.nondet.web.render`)
2. **LLM Analysis** — GenLayer's `gl.nondet.exec_prompt` analyzes whether the article's claims match the actual source content
3. **Fraud Detection** — AI risk scoring detects AI-generated content signatures
4. **Consensus Verdict** — Multiple validators must agree before the verdict is recorded on-chain
5. **Immutable Record** — The hash, scores, and verdict are permanently stored — impossible to alter

---

## 🔴 Why GenLayer Is Non-Negotiable

| Capability | Solidity/EVM | GenLayer |
|---|---|---|
| Read a live URL during contract execution | ❌ Impossible | ✅ `gl.nondet.web.render()` |
| Run LLM analysis in a smart contract | ❌ Impossible | ✅ `gl.nondet.exec_prompt()` |
| Multi-validator consensus on AI output | ❌ Impossible | ✅ Built-in with `run_nondet_unsafe` |
| Immutable AI verdict on-chain | ❌ Would need an oracle (trusted 3rd party) | ✅ Native, trustless |
| Semantic validation of results | ❌ N/A | ✅ `validator_fn` checks logic |

**SourceChain is structurally impossible on any other blockchain.** Every core feature depends on GenLayer's unique architecture.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SourceChain dApp                         │
│                                                             │
│  Frontend (Next.js + genlayer-js)                          │
│  ├── Landing + Verified Feed                               │
│  ├── Submit Form (with consensus loading state)            │
│  ├── Article Detail + Verification Report                  │
│  └── Challenge Flow                                        │
│                                                             │
│  Smart Contracts (GenLayer Python)                         │
│  ├── SourceChainRegistry.py  ← AI Verification Engine     │
│  │   ├── submit_article()    → store PENDING submission   │
│  │   ├── verify_article()    → fetch URLs + LLM + verdict │
│  │   ├── challenge_article() → re-verify with evidence    │
│  │   ├── get_verification()  → read full report           │
│  │   └── get_all_verified()  → feed data                  │
│  │                                                         │
│  └── SourceChainTreasury.py  ← Incentive Layer           │
│      ├── deposit_stake()     → author stakes before submit│
│      ├── release_stake()     → return stake on VERIFIED   │
│      ├── slash_and_reward()  → slash fraud, pay challenger│
│      └── claim_challenger_reward()                        │
└─────────────────────────────────────────────────────────────┘

GenLayer AI Consensus Flow:
  leader_fn() → gl.nondet.web.render(url) × 3 URLs
             → gl.nondet.exec_prompt(fact_check_prompt)
             → returns { source_accuracy, context_integrity,
                         ai_generated_risk, verdict, reason }

  validator_fn() → checks SEMANTIC MEANING (not just schema)
               → verdict must be logically consistent
               → rejects if accuracy < 0.7 but verdict = VERIFIED

  Multiple validators must agree → immutable on-chain record
```

---

## 📁 Project Structure

```
sourcechain/
├── contracts/
│   ├── SourceChainRegistry.py      # AI verification engine
│   └── SourceChainTreasury.py      # Incentive/stake management
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages
│   │   │   ├── page.tsx            # Landing + verified feed
│   │   │   ├── submit/page.tsx     # Submit article form
│   │   │   ├── article/[id]/page.tsx  # Verification report
│   │   │   └── challenge/[id]/page.tsx # Challenge flow
│   │   ├── components/             # React components
│   │   └── lib/                    # genlayer-js client + helpers
│   └── package.json
├── tests/
│   ├── test_registry.py            # 35 tests: happy path + edge cases
│   └── test_treasury.py            # 35 tests: stake/slash mechanics
└── scripts/
    └── deploy.sh                   # Interactive deploy guide
```

---

## 🚀 Deploy to Testnet (Step by Step)

### Prerequisites

- GenLayer Studio account: [studio.genlayer.com](https://studio.genlayer.com)
- Node.js 18+ and Python 3.10+

### Step 1: Deploy SourceChainTreasury.py

> Treasury must be deployed first since Registry needs its address.

1. Open [GenLayer Studio](https://studio.genlayer.com)
2. **Settings → Reset Storage → Confirm**
3. **Hard refresh** (Ctrl+Shift+F5)
4. Upload `contracts/SourceChainTreasury.py`
5. Constructor arguments:
   ```
   registry_address: "0x0000000000000000000000000000000000000000"
   submission_fee:   1000000
   slash_percentage: 50
   ```
6. Click **Deploy**
7. In the sidebar, click the tx → verify **Result: SUCCESS** ✅
8. **Copy the contract address** (e.g. `0xabc123...`)

> ⚠️ **IMPORTANT**: Check that the result says `SUCCESS`, not just `FINALIZED`. They are different.

### Step 2: Deploy SourceChainRegistry.py

1. Upload `contracts/SourceChainRegistry.py`
2. Constructor arguments:
   ```
   treasury_address: "<Treasury address from Step 1>"
   admin_address:    "<your wallet address>"
   ```
3. Click **Deploy**
4. Verify **Result: SUCCESS** ✅
5. Copy the Registry contract address

### Step 3: Configure Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_REGISTRY_ADDRESS=0x<registry-address>
# NEXT_PUBLIC_TREASURY_ADDRESS=0x<treasury-address>
```

### Step 4: Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Step 5: Smoke Test via Studio UI

1. In Studio, select **SourceChainRegistry**
2. Call `submit_article()`:
   ```
   article_id:      "test-001"
   article_hash:    "sha256:abc123test"
   article_title:   "Test Article Title Here"
   article_text:    "This is a test article with sufficient length for AI analysis..."
   source_urls:     '["https://example.com"]'
   author_address:  "<your-address>"
   ```
3. Call `get_article_status("test-001")` → should return `"PENDING"`
4. Call `verify_article("test-001")` → wait 30–90s
5. Check result → `"VERIFIED"` or `"REJECTED"`

---

## 🧪 Running Tests

```bash
pip install pytest
python -m pytest tests/ -v
# Expected: 70 tests passing
```

Test coverage includes:
- Happy path: submit → verify → VERIFIED
- Edge cases: dead URLs, empty source list, malformed JSON
- Validator semantics: 12 tests verifying logical consistency checks
- Treasury mechanics: stake, slash, claim flows
- Integration: multi-article, mixed verdict feeds

---

## 🎨 Frontend Features

| Feature | Description |
|---|---|
| Dark glassmorphism UI | Premium design with animated background grid |
| Wallet connect | genlayer-js account creation + local storage |
| Consensus loading | Animated validator orbs + progress bar (30–90s) |
| Score meters | Source accuracy, AI risk, context integrity |
| TX hash links | Every transaction links to GenLayer explorer |
| Responsive | Works on mobile and desktop |
| Demo mode | Works without deployed contracts (shows sample data) |

---

## 📋 GenLayer Compliance Checklist

All contracts strictly follow GenLayer's deployment rules:

- [x] First line: `# v0.2.16`
- [x] Second line: `# { "Depends": "py-genlayer:..." }`
- [x] `__init__` does NOT assign `TreeMap()` or `DynArray()`
- [x] No `float` in public method signatures
- [x] Storage uses `TreeMap[K,V]` and `DynArray[T]`
- [x] Class named `Contract` extending `gl.Contract`
- [x] All `gl.nondet.*` calls inside `gl.vm.run_nondet_unsafe`
- [x] Import: `from genlayer import *` (never `import genlayer`)
- [x] `validator_fn` checks **semantic meaning** (logical consistency of verdict)

---

## 🔗 Links

- **Live App**: _Deploy to Vercel and update here_
- **Video Demo**: _Record demo and update here_
- **GenLayer Studio**: [studio.genlayer.com](https://studio.genlayer.com)
- **GenLayer Docs**: [docs.genlayer.com](https://docs.genlayer.com)

---

## 📄 License

MIT © 2025 SourceChain

---

*Built for the GenLayer Builder Program. One-line pitch: "SourceChain dies without GenLayer — because nothing else can read a live URL on-chain, analyze citation semantics with an LLM, and record an immutable verdict without a trusted third party."*
