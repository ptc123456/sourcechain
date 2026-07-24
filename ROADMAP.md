# Project Roadmap

This roadmap reflects the verified state of SourceChain V1 as of July 2026. It separates delivered capabilities from proposed future milestones.

## V1 Delivered

### Product & Core Architecture
SourceChain is a decentralized, verifiable news journalism dApp on GenLayer. It enables journalists to submit news articles with citation URLs, automatically verify citation accuracy and AI content risk using GenLayer's on-chain web scraping and LLM consensus, and publish verifiable articles to an immutable on-chain feed.

The V1 pipeline:
1. **Article Submission & Staking:** A journalist submits an article title, content, and up to 3 citation URLs while locking an author stake in `SourceChainTreasury`.
2. **On-Chain Web Scraping:** GenLayer leader fetches citation source HTML/text directly via `gl.nondet.web.render()`.
3. **Semantic LLM Evaluation:** GenLayer executes `gl.nondet.exec_prompt()` to check source accuracy, context integrity, and AI generation risk.
4. **Validator Consensus:** Independent validators verify the semantic reasoning and score consistency through `validator_fn`.
5. **Settlement & Feed:** Verified articles are added to `verified_ids` for the public news feed, and author stakes are returned. Fraudulent content is rejected and slashed.

### Intelligent Contracts
Deployed on GenLayer Testnet Asimov:
- **`SourceChainRegistry.py`:** `0x9420f93DE811771fC182EcCE03C7a55F90190f43` (AI verification engine)
- **`SourceChainTreasury.py`:** `0x71A672b4C64962b109D96081e7d23dCeeF7c0303` (Stake escrow & challenge protocol)

### Frontend & UI
- **Tech Stack:** Next.js App Router, Tailwind CSS, TypeScript, `genlayer-js`.
- **Features:** Landing page with verified news feed, article submission with live consensus spinner, detailed verification report modal, and challenge flow.

---

## V2 Future Roadmap

### Phase 1: Decentralized Reputation & Community Bounties
- [ ] Journalist reputation score (Journalist Trust Score) calculated on-chain based on verification history.
- [ ] Community-funded fact-checking bounties for high-impact news stories.
- [ ] Automated RSS feed ingestion for decentralized news aggregators.

### Phase 2: Multi-Language & Archive Integration
- [ ] Multi-lingual fact-checking prompt templates (Spanish, Vietnamese, French, Mandarin).
- [ ] Integration with Internet Archive (Wayback Machine API) for historical URL snapshot verification.
- [ ] Mobile PWA application for field journalists.
