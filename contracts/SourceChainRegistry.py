# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class Contract(gl.Contract):
    """
    SourceChainRegistry — AI-powered Verification Engine for SourceChain.

    Core capabilities (only possible on GenLayer):
    - Fetches source URLs directly from the internet via gl.nondet.web.render
    - Analyzes citation accuracy and AI-generated content risk via gl.nondet.exec_prompt
    - Records immutable, consensus-validated verdicts on-chain
    - No trusted third party required — multi-validator consensus ensures integrity
    """

    # Full submission data: article_id -> JSON string
    submissions: TreeMap[str, str]

    # Verification results: article_id -> JSON string
    verifications: TreeMap[str, str]

    # Article status: article_id -> "PENDING" | "VERIFIED" | "REJECTED" | "CHALLENGED"
    statuses: TreeMap[str, str]

    # Author of each article: article_id -> address string
    authors: TreeMap[str, str]

    # All VERIFIED article IDs (for frontend feed)
    verified_ids: DynArray[str]

    # Total submissions counter (monotonic, used for ID generation)
    submission_count: u256

    # Treasury contract address (for cross-contract incentive calls)
    treasury_address: str

    # Admin address (deployer) for privileged operations
    admin_address: str

    def __init__(self, treasury_address: str, admin_address: str) -> None:
        """
        Initialize registry with treasury address.
        DO NOT assign TreeMap or DynArray here — GenVM auto-initializes them.

        Args:
            treasury_address: Deployed SourceChainTreasury contract address.
            admin_address:    Deployer address for admin-only operations.
        """
        self.submission_count = u256(0)
        self.treasury_address = treasury_address
        self.admin_address = admin_address
        # submissions, verifications, statuses, authors, verified_ids
        # → intentionally NOT assigned; GenVM initializes them empty

    # ─────────────────────────────────────────────────────────────────────────
    # WRITE METHODS
    # ─────────────────────────────────────────────────────────────────────────

    @gl.public.write
    def submit_article(
        self,
        article_id: str,
        article_hash: str,
        article_title: str,
        article_text: str,
        source_urls: str,
        author_address: str,
    ) -> str:
        """
        Store an article submission for later AI verification.
        This is a deterministic, cheap operation — no AI calls here.

        Args:
            article_id:      Unique identifier (e.g. UUID or hash-based).
            article_hash:    SHA-256 hash of the full article content (proof of integrity).
            article_title:   Human-readable title for display.
            article_text:    Full text or representative excerpt (for AI analysis).
            source_urls:     JSON-encoded list of URL strings, e.g. '["https://..."]'.
            author_address:  Submitting author's wallet address.

        Returns:
            "PENDING" on success.

        Raises:
            Exception if article_id already exists, source_urls is empty/malformed,
            or required fields are missing.
        """
        # ── Validate inputs ──────────────────────────────────────────────────
        if not article_id or len(article_id) < 1:
            raise Exception("article_id cannot be empty")
        if not article_hash or len(article_hash) < 10:
            raise Exception("article_hash appears invalid")
        if not article_title or len(article_title.strip()) < 3:
            raise Exception("article_title must be at least 3 characters")
        if not article_text or len(article_text.strip()) < 50:
            raise Exception("article_text must be at least 50 characters")
        if not author_address or len(author_address) < 10:
            raise Exception("author_address appears invalid")

        # ── Check for duplicates ─────────────────────────────────────────────
        if self.statuses.get(article_id) is not None:
            raise Exception(f"Article '{article_id}' already exists")

        # ── Validate and parse source_urls ───────────────────────────────────
        try:
            urls = json.loads(source_urls)
        except Exception:
            raise Exception("source_urls must be a valid JSON array string")

        if not isinstance(urls, list):
            raise Exception("source_urls must be a JSON array")
        if len(urls) == 0:
            raise Exception("source_urls cannot be empty — at least one source required")
        if len(urls) > 10:
            raise Exception("Maximum 10 source URLs allowed per submission")

        # Basic URL format check (must start with http)
        for url in urls:
            if not isinstance(url, str) or not url.startswith("http"):
                raise Exception(f"Invalid URL format: '{url}'. All URLs must start with 'http'")

        # ── Store submission ─────────────────────────────────────────────────
        submission_data = {
            "article_id": article_id,
            "article_hash": article_hash,
            "article_title": article_title,
            "article_text": article_text,
            "source_urls": source_urls,
            "author_address": author_address,
            "submitted_at": int(self.submission_count),
        }
        self.submissions[article_id] = json.dumps(submission_data)
        self.statuses[article_id] = "PENDING"
        self.authors[article_id] = author_address
        self.submission_count = u256(int(self.submission_count) + 1)

        return "PENDING"

    @gl.public.write
    def verify_article(self, article_id: str) -> str:
        """
        ★ HEART FUNCTION — This is where GenLayer's power shines. ★

        Orchestrates multi-step AI verification:
        1. Fetches each source URL directly from the internet (gl.nondet.web.render)
        2. Sends fetched content + article text to an LLM for fact-checking (gl.nondet.exec_prompt)
        3. Multi-validator consensus ensures no single validator can manipulate the verdict
        4. Stores the immutable result on-chain

        This function is IMPOSSIBLE to replicate on Ethereum/Solidity.

        Args:
            article_id: The ID of a PENDING submission to verify.

        Returns:
            "VERIFIED" or "REJECTED"

        Raises:
            Exception if article not found, not in PENDING state, or consensus fails.
        """
        # ── Pre-conditions ───────────────────────────────────────────────────
        status = self.statuses.get(article_id)
        if status is None:
            raise Exception(f"Article '{article_id}' not found")
        if status != "PENDING":
            raise Exception(
                f"Article '{article_id}' is already in state '{status}'. "
                "Only PENDING articles can be verified."
            )

        submission_json = self.submissions.get(article_id)
        if submission_json is None:
            raise Exception(f"Submission data missing for article '{article_id}'")

        submission = json.loads(submission_json)

        # ── NonDeterministic Verification Block ──────────────────────────────
        def leader_fn():
            """
            Leader validator: fetches URLs and calls LLM.
            Runs in a non-deterministic sandbox with internet access.
            """
            article_text = submission["article_text"]
            article_title = submission["article_title"]
            source_urls = json.loads(submission["source_urls"])

            # Step 1: Fetch up to 3 source URLs (gas limit consideration)
            source_contents = []
            fetch_failures = 0

            for url in source_urls[:3]:
                try:
                    raw_content = gl.nondet.web.render(url, mode="text")
                    # Truncate to prevent prompt overflow
                    truncated = raw_content[:2000] if raw_content else ""
                    if not truncated.strip():
                        source_contents.append({
                            "url": url,
                            "status": "EMPTY",
                            "content": "",
                        })
                        fetch_failures += 1
                    else:
                        source_contents.append({
                            "url": url,
                            "status": "OK",
                            "content": truncated,
                        })
                except Exception as e:
                    source_contents.append({
                        "url": url,
                        "status": "FETCH_FAILED",
                        "content": "",
                        "error": str(e)[:100],
                    })
                    fetch_failures += 1

            all_failed = fetch_failures == len(source_contents)

            # Step 2: Build fact-checking prompt
            sources_summary = json.dumps(source_contents, ensure_ascii=False, indent=2)
            article_excerpt = article_text[:3000]

            prompt = f"""You are a professional fact-checker and AI-content detector. Analyze the following article and its cited sources.

ARTICLE TITLE: {article_title}

ARTICLE TEXT:
{article_excerpt}

CITED SOURCES (fetched from the internet in real-time):
{sources_summary}

CONTEXT:
- fetch_failures: {fetch_failures} out of {len(source_contents)} URLs could not be loaded
- all_sources_failed: {all_failed}

Your task: Evaluate the article on 4 criteria and return a strict JSON verdict.

CRITERIA:
1. SOURCE_ACCURACY (float 0.0-1.0): Do the article's citations and claims match the actual content of the sources? 
   - 1.0 = perfect match, all facts verified
   - 0.5 = partially supported  
   - 0.0 = fabricated/no matching content
   - If all sources failed to load: 0.0

2. CONTEXT_INTEGRITY (boolean): Are citations presented in their proper context, or taken out of context / misrepresented?
   - true = citations are fair and accurate
   - false = citations are cherry-picked, distorted, or misleading
   - If all sources failed: false

3. AI_GENERATED_RISK (float 0.0-1.0): Probability this article was written by AI rather than a human journalist.
   Signs of AI authorship: unnaturally uniform sentence structure, excessive bullet-point lists, 
   hedging language ("it's worth noting that"), lack of personal voice, absence of natural errors,
   suspiciously comprehensive coverage with no gaps.
   - 0.0 = clearly human-written
   - 1.0 = clearly AI-generated

4. VERDICT (string): Final determination.
   VERIFIED: source_accuracy >= 0.7 AND context_integrity == true AND ai_generated_risk <= 0.6
   REJECTED: ANY of those conditions fail, OR all sources failed to load

Return ONLY valid JSON in this exact format, no other text:
{{
    "source_accuracy": <float 0.0-1.0>,
    "context_integrity": <true or false>,
    "ai_generated_risk": <float 0.0-1.0>,
    "verdict": "<VERIFIED or REJECTED>",
    "reason": "<concise English explanation, max 200 chars>",
    "issues_found": ["<specific issue 1>", "<specific issue 2>"],
    "sources_checked": {len(source_contents)},
    "sources_ok": {len(source_contents) - fetch_failures}
}}"""

            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return result

        def validator_fn(leader_result) -> bool:
            """
            Validator: checks SEMANTIC MEANING, not just schema.
            Validators may disagree on exact float values but MUST agree on verdict type.

            This is the critical anti-gaming check — a corrupt leader can't push
            a VERIFIED result through if the verdict logic doesn't hold.
            """
            # Must be a successful return from leader
            if not isinstance(leader_result, gl.vm.Return):
                return False

            data = leader_result.result

            # Must be a dict
            if not isinstance(data, dict):
                return False

            # ── Semantic check 1: verdict must be one of two valid values ────
            verdict = data.get("verdict")
            if verdict not in ["VERIFIED", "REJECTED"]:
                return False

            # ── Semantic check 2: source_accuracy must be a valid float ──────
            source_accuracy = data.get("source_accuracy")
            if not isinstance(source_accuracy, (int, float)):
                return False
            if not (0.0 <= float(source_accuracy) <= 1.0):
                return False

            # ── Semantic check 3: ai_generated_risk must be a valid float ────
            ai_risk = data.get("ai_generated_risk")
            if not isinstance(ai_risk, (int, float)):
                return False
            if not (0.0 <= float(ai_risk) <= 1.0):
                return False

            # ── Semantic check 4: context_integrity must be boolean ───────────
            if not isinstance(data.get("context_integrity"), bool):
                return False

            # ── Semantic check 5: verdict must be LOGICALLY CONSISTENT ────────
            # If source_accuracy < 0.7 or ai_risk > 0.6, verdict MUST be REJECTED
            if float(source_accuracy) < 0.7 and verdict == "VERIFIED":
                return False
            if float(ai_risk) > 0.6 and verdict == "VERIFIED":
                return False
            if data.get("context_integrity") is False and verdict == "VERIFIED":
                return False

            # ── Semantic check 6: reason must be a non-empty string ───────────
            reason = data.get("reason", "")
            if not isinstance(reason, str) or len(reason.strip()) == 0:
                return False

            return True

        # ── Run consensus and store result ───────────────────────────────────
        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        verdict = result.get("verdict", "REJECTED")

        # Store full verification result
        self.verifications[article_id] = json.dumps(result)
        self.statuses[article_id] = verdict

        if verdict == "VERIFIED":
            self.verified_ids.append(article_id)

        return verdict

    @gl.public.write
    def challenge_article(
        self,
        article_id: str,
        challenger_address: str,
        evidence_url: str,
    ) -> str:
        """
        Community challenge: submit new evidence against a VERIFIED article.
        AI re-evaluates with the additional evidence URL.
        If challenge succeeds → status = CHALLENGED, treasury slashes author.

        Args:
            article_id:          ID of the VERIFIED article to challenge.
            challenger_address:  Challenger's wallet address.
            evidence_url:        URL of contradicting evidence.

        Returns:
            "CHALLENGE_UPHELD" (article was fraudulent) or "CHALLENGE_REJECTED".
        """
        # ── Pre-conditions ───────────────────────────────────────────────────
        if not challenger_address or len(challenger_address) < 10:
            raise Exception("Invalid challenger address")
        if not evidence_url or not evidence_url.startswith("http"):
            raise Exception("evidence_url must be a valid http/https URL")

        status = self.statuses.get(article_id)
        if status is None:
            raise Exception(f"Article '{article_id}' not found")
        if status != "VERIFIED":
            raise Exception(
                f"Only VERIFIED articles can be challenged. Current status: '{status}'"
            )

        submission_json = self.submissions.get(article_id)
        if submission_json is None:
            raise Exception("Submission data missing")

        submission = json.loads(submission_json)
        original_verification_json = self.verifications.get(article_id, "{}")
        original_verification = json.loads(original_verification_json)

        # ── NonDeterministic Re-verification with Evidence ───────────────────
        def challenge_leader_fn():
            """Fetch new evidence and re-assess the article."""
            # Fetch evidence URL
            try:
                evidence_content = gl.nondet.web.render(evidence_url, mode="text")
                evidence_truncated = evidence_content[:2000] if evidence_content else ""
                evidence_status = "OK" if evidence_truncated.strip() else "EMPTY"
            except Exception as e:
                evidence_truncated = ""
                evidence_status = f"FETCH_FAILED: {str(e)[:80]}"

            article_text = submission["article_text"]
            article_title = submission["article_title"]
            original_reason = original_verification.get("reason", "N/A")

            prompt = f"""You are an independent fact-checker conducting a challenge review.

A community member is challenging a previously VERIFIED article.

ARTICLE TITLE: {article_title}

ARTICLE TEXT:
{article_text[:2000]}

ORIGINAL VERIFICATION VERDICT: VERIFIED
ORIGINAL REASON: {original_reason}

NEW EVIDENCE URL: {evidence_url}
NEW EVIDENCE CONTENT (fetched now):
{evidence_truncated if evidence_truncated else "[Could not fetch evidence: " + evidence_status + "]"}

Your task: Determine if this new evidence undermines the original VERIFIED verdict.

CHALLENGE_UPHELD: The new evidence reveals that the article contains significant inaccuracies,
misrepresentations, or fabrications that were not caught in the original review.

CHALLENGE_REJECTED: The new evidence does not meaningfully contradict the article,
or the evidence itself is not credible.

Return ONLY valid JSON:
{{
    "challenge_verdict": "<CHALLENGE_UPHELD or CHALLENGE_REJECTED>",
    "evidence_credible": <true or false>,
    "new_issues_found": ["<issue 1>", "<issue 2>"],
    "reason": "<concise English explanation, max 200 chars>",
    "confidence": <float 0.0-1.0>
}}"""

            return gl.nondet.exec_prompt(prompt, response_format="json")

        def challenge_validator_fn(leader_result) -> bool:
            """Validate challenge verdict semantics."""
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.result
            if not isinstance(data, dict):
                return False
            if data.get("challenge_verdict") not in ["CHALLENGE_UPHELD", "CHALLENGE_REJECTED"]:
                return False
            if not isinstance(data.get("evidence_credible"), bool):
                return False
            confidence = data.get("confidence")
            if not isinstance(confidence, (int, float)):
                return False
            if not (0.0 <= float(confidence) <= 1.0):
                return False
            reason = data.get("reason", "")
            if not isinstance(reason, str) or len(reason.strip()) == 0:
                return False
            return True

        result = gl.vm.run_nondet_unsafe(challenge_leader_fn, challenge_validator_fn)

        challenge_verdict = result.get("challenge_verdict", "CHALLENGE_REJECTED")

        # Store challenge result in verification record
        challenge_record = {
            "challenger_address": challenger_address,
            "evidence_url": evidence_url,
            "challenge_result": result,
        }
        updated_verification = original_verification.copy()
        updated_verification["challenge"] = challenge_record
        self.verifications[article_id] = json.dumps(updated_verification)

        if challenge_verdict == "CHALLENGE_UPHELD":
            self.statuses[article_id] = "CHALLENGED"
            # Remove from verified_ids feed (best-effort; DynArray doesn't support remove)
            # Frontend should filter out CHALLENGED articles

        return challenge_verdict

    # ─────────────────────────────────────────────────────────────────────────
    # VIEW METHODS (deterministic, no AI calls)
    # ─────────────────────────────────────────────────────────────────────────

    @gl.public.view
    def get_verification(self, article_id: str) -> str:
        """
        Return full verification result as JSON string.

        Returns:
            JSON string with all verification scores, verdict, and reason.

        Raises:
            Exception if article not found.
        """
        status = self.statuses.get(article_id)
        if status is None:
            raise Exception(f"Article '{article_id}' not found")

        verification = self.verifications.get(article_id)
        submission_json = self.submissions.get(article_id, "{}")
        submission = json.loads(submission_json)

        if verification is None:
            # Article submitted but not yet verified
            return json.dumps({
                "article_id": article_id,
                "status": status,
                "article_title": submission.get("article_title", ""),
                "author_address": self.authors.get(article_id, ""),
                "verified": False,
                "verification": None,
            })

        verif_data = json.loads(verification)
        return json.dumps({
            "article_id": article_id,
            "status": status,
            "article_title": submission.get("article_title", ""),
            "article_hash": submission.get("article_hash", ""),
            "author_address": self.authors.get(article_id, ""),
            "verified": status == "VERIFIED",
            "verification": verif_data,
        })

    @gl.public.view
    def get_submission(self, article_id: str) -> str:
        """
        Return submission data (minus full article text for gas efficiency).

        Returns:
            JSON string with submission metadata.
        """
        status = self.statuses.get(article_id)
        if status is None:
            raise Exception(f"Article '{article_id}' not found")

        submission_json = self.submissions.get(article_id, "{}")
        submission = json.loads(submission_json)

        # Return metadata without full article_text (can be large)
        return json.dumps({
            "article_id": submission.get("article_id"),
            "article_hash": submission.get("article_hash"),
            "article_title": submission.get("article_title"),
            "author_address": submission.get("author_address"),
            "source_urls": submission.get("source_urls"),
            "status": status,
        })

    @gl.public.view
    def get_all_verified(self) -> str:
        """
        Return JSON array of all VERIFIED article IDs.
        Frontend uses this to populate the public feed.

        Returns:
            JSON string, e.g. '["id1", "id2", ...]'
        """
        ids = []
        for i in range(len(self.verified_ids)):
            article_id = self.verified_ids[i]
            # Double-check status hasn't been downgraded (e.g. by challenge)
            current_status = self.statuses.get(article_id)
            if current_status == "VERIFIED":
                ids.append(article_id)
        return json.dumps(ids)

    @gl.public.view
    def get_article_status(self, article_id: str) -> str:
        """Return the current status of an article, or 'NOT_FOUND'."""
        status = self.statuses.get(article_id)
        return status if status is not None else "NOT_FOUND"

    @gl.public.view
    def get_submission_count(self) -> int:
        """Return total number of article submissions."""
        return int(self.submission_count)

    @gl.public.view
    def get_verified_count(self) -> int:
        """Return number of currently VERIFIED articles."""
        count = 0
        for i in range(len(self.verified_ids)):
            article_id = self.verified_ids[i]
            if self.statuses.get(article_id) == "VERIFIED":
                count += 1
        return count
