"""
test_registry.py — Tests for SourceChainRegistry

These tests are designed to run against the GenLayer testnet simulator.
They cover: happy path, edge cases, and security invariants.

Run with: python -m pytest tests/test_registry.py -v
(Requires GenLayer Python SDK / test harness)
"""

import json
import pytest

# ─────────────────────────────────────────────────────────────────────────────
# Mock / Stub infrastructure for offline unit testing
# In real GenLayer testing, you'd use the genlayer-py test runner
# ─────────────────────────────────────────────────────────────────────────────


class MockNondet:
    """Simulate gl.nondet behavior for offline testing."""

    def __init__(self, web_responses=None, llm_response=None):
        self.web_responses = web_responses or {}
        self.llm_response = llm_response or {}
        self.calls = []

    def web_render(self, url, mode="text"):
        self.calls.append(("web_render", url))
        if url in self.web_responses:
            response = self.web_responses[url]
            if response is None:
                raise Exception(f"Connection refused: {url}")
            return response
        return f"[Mock content for {url}] This is simulated web content."

    def exec_prompt(self, prompt, response_format=None):
        self.calls.append(("exec_prompt", prompt[:50]))
        return self.llm_response


class MockContract:
    """
    Minimal mock of the Registry contract logic for unit-testing
    the validation and business rules WITHOUT deploying to GenLayer.
    """

    def __init__(self):
        self.submissions = {}
        self.verifications = {}
        self.statuses = {}
        self.authors = {}
        self.verified_ids = []
        self.submission_count = 0
        self.treasury_address = "0xTREASURY_MOCK"
        self.admin_address = "0xADMIN_MOCK"

    def submit_article(
        self, article_id, article_hash, article_title, article_text, source_urls, author_address
    ):
        """Replicate the pure Python logic of submit_article."""
        if not article_id:
            raise Exception("article_id cannot be empty")
        if not article_hash or len(article_hash) < 10:
            raise Exception("article_hash appears invalid")
        if not article_title or len(article_title.strip()) < 3:
            raise Exception("article_title must be at least 3 characters")
        if not article_text or len(article_text.strip()) < 50:
            raise Exception("article_text must be at least 50 characters")
        if not author_address or len(author_address) < 10:
            raise Exception("author_address appears invalid")
        if article_id in self.statuses:
            raise Exception(f"Article '{article_id}' already exists")

        try:
            urls = json.loads(source_urls)
        except Exception:
            raise Exception("source_urls must be a valid JSON array string")

        if not isinstance(urls, list):
            raise Exception("source_urls must be a JSON array")
        if len(urls) == 0:
            raise Exception("source_urls cannot be empty")
        if len(urls) > 10:
            raise Exception("Maximum 10 source URLs allowed")
        for url in urls:
            if not isinstance(url, str) or not url.startswith("http"):
                raise Exception(f"Invalid URL format: '{url}'")

        self.submissions[article_id] = json.dumps({
            "article_id": article_id,
            "article_hash": article_hash,
            "article_title": article_title,
            "article_text": article_text,
            "source_urls": source_urls,
            "author_address": author_address,
        })
        self.statuses[article_id] = "PENDING"
        self.authors[article_id] = author_address
        self.submission_count += 1
        return "PENDING"

    def _run_verification(self, article_id, mock_nondet: MockNondet):
        """Simulate verify_article with mock nondet."""
        status = self.statuses.get(article_id)
        if status is None:
            raise Exception(f"Article '{article_id}' not found")
        if status != "PENDING":
            raise Exception(f"Article '{article_id}' is already in state '{status}'")

        submission = json.loads(self.submissions[article_id])
        source_urls = json.loads(submission["source_urls"])

        source_contents = []
        fetch_failures = 0
        for url in source_urls[:3]:
            try:
                content = mock_nondet.web_render(url, mode="text")
                source_contents.append({"url": url, "status": "OK", "content": content[:200]})
            except Exception:
                source_contents.append({"url": url, "status": "FETCH_FAILED", "content": ""})
                fetch_failures += 1

        # Get LLM response from mock
        result = mock_nondet.exec_prompt("...", response_format="json")

        self.verifications[article_id] = json.dumps(result)
        self.statuses[article_id] = result["verdict"]
        if result["verdict"] == "VERIFIED":
            self.verified_ids.append(article_id)
        return result["verdict"]

    def validator_fn(self, leader_result_data):
        """Replicate the semantic validation logic."""
        data = leader_result_data
        if not isinstance(data, dict):
            return False
        verdict = data.get("verdict")
        if verdict not in ["VERIFIED", "REJECTED"]:
            return False
        source_accuracy = data.get("source_accuracy")
        if not isinstance(source_accuracy, (int, float)):
            return False
        if not (0.0 <= float(source_accuracy) <= 1.0):
            return False
        ai_risk = data.get("ai_generated_risk")
        if not isinstance(ai_risk, (int, float)):
            return False
        if not (0.0 <= float(ai_risk) <= 1.0):
            return False
        if not isinstance(data.get("context_integrity"), bool):
            return False
        # Logical consistency checks
        if float(source_accuracy) < 0.7 and verdict == "VERIFIED":
            return False
        if float(ai_risk) > 0.6 and verdict == "VERIFIED":
            return False
        if data.get("context_integrity") is False and verdict == "VERIFIED":
            return False
        reason = data.get("reason", "")
        if not isinstance(reason, str) or len(reason.strip()) == 0:
            return False
        return True


# ─────────────────────────────────────────────────────────────────────────────
# FIXTURES
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def contract():
    return MockContract()


SAMPLE_ARTICLE = {
    "article_id": "article-001",
    "article_hash": "sha256:abc123def456abc123def456abc123def456",
    "article_title": "Climate Change Accelerates in 2024",
    "article_text": (
        "A new study from NASA confirms that global temperatures rose by 1.2°C above "
        "pre-industrial levels in 2024. The Arctic ice sheet lost a record 3.2 million km² "
        "this summer, accelerating predictions of sea level rise. Scientists warn that "
        "without immediate action, coastal cities face flooding by 2050. The study, "
        "published in Nature Climate Change, analyzed 40 years of satellite data."
    ),
    "source_urls": json.dumps([
        "https://climate.nasa.gov/news/2024-temperature-record",
        "https://www.nature.com/articles/climate2024",
    ]),
    "author_address": "0xAuthor123456789ABCDEF",
}

GOOD_LLM_RESPONSE = {
    "source_accuracy": 0.85,
    "context_integrity": True,
    "ai_generated_risk": 0.2,
    "verdict": "VERIFIED",
    "reason": "All cited facts confirmed in NASA and Nature sources. Human writing style detected.",
    "issues_found": [],
    "sources_checked": 2,
    "sources_ok": 2,
}

REJECTED_LLM_RESPONSE = {
    "source_accuracy": 0.3,
    "context_integrity": False,
    "ai_generated_risk": 0.9,
    "verdict": "REJECTED",
    "reason": "Sources do not support claims. High AI-generated content risk detected.",
    "issues_found": ["NASA link does not contain cited temperature data", "AI-like sentence patterns"],
    "sources_checked": 2,
    "sources_ok": 1,
}

ALL_FAILED_LLM_RESPONSE = {
    "source_accuracy": 0.0,
    "context_integrity": False,
    "ai_generated_risk": 0.5,
    "verdict": "REJECTED",
    "reason": "All source URLs failed to load. Cannot verify citations.",
    "issues_found": ["All URLs returned FETCH_FAILED"],
    "sources_checked": 2,
    "sources_ok": 0,
}


# ─────────────────────────────────────────────────────────────────────────────
# HAPPY PATH TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestSubmitArticle:
    def test_submit_success(self, contract):
        """Happy path: valid submission returns PENDING."""
        result = contract.submit_article(**SAMPLE_ARTICLE)
        assert result == "PENDING"
        assert contract.statuses["article-001"] == "PENDING"
        assert contract.authors["article-001"] == SAMPLE_ARTICLE["author_address"]

    def test_submit_increments_counter(self, contract):
        """Each submission increments the counter."""
        assert contract.submission_count == 0
        contract.submit_article(**SAMPLE_ARTICLE)
        assert contract.submission_count == 1

    def test_submit_duplicate_fails(self, contract):
        """Submitting the same article_id twice raises an exception."""
        contract.submit_article(**SAMPLE_ARTICLE)
        with pytest.raises(Exception, match="already exists"):
            contract.submit_article(**SAMPLE_ARTICLE)

    def test_submit_stores_submission_data(self, contract):
        """Submission data is correctly stored in the submissions map."""
        contract.submit_article(**SAMPLE_ARTICLE)
        stored = json.loads(contract.submissions["article-001"])
        assert stored["article_title"] == SAMPLE_ARTICLE["article_title"]
        assert stored["article_hash"] == SAMPLE_ARTICLE["article_hash"]


class TestVerifyArticle:
    def test_verify_happy_path_verified(self, contract):
        """Happy path: article passes all checks → VERIFIED."""
        contract.submit_article(**SAMPLE_ARTICLE)
        mock = MockNondet(llm_response=GOOD_LLM_RESPONSE)
        verdict = contract._run_verification("article-001", mock)
        assert verdict == "VERIFIED"
        assert "article-001" in contract.verified_ids
        assert contract.statuses["article-001"] == "VERIFIED"

    def test_verify_happy_path_rejected(self, contract):
        """Article with bad sources → REJECTED."""
        contract.submit_article(**SAMPLE_ARTICLE)
        mock = MockNondet(llm_response=REJECTED_LLM_RESPONSE)
        verdict = contract._run_verification("article-001", mock)
        assert verdict == "REJECTED"
        assert "article-001" not in contract.verified_ids

    def test_verify_stores_full_result(self, contract):
        """Verification stores all score fields."""
        contract.submit_article(**SAMPLE_ARTICLE)
        mock = MockNondet(llm_response=GOOD_LLM_RESPONSE)
        contract._run_verification("article-001", mock)
        stored = json.loads(contract.verifications["article-001"])
        assert stored["source_accuracy"] == 0.85
        assert stored["ai_generated_risk"] == 0.2
        assert stored["verdict"] == "VERIFIED"

    def test_verify_calls_web_render_per_url(self, contract):
        """verify_article fetches each URL via web.render."""
        contract.submit_article(**SAMPLE_ARTICLE)
        mock = MockNondet(llm_response=GOOD_LLM_RESPONSE)
        contract._run_verification("article-001", mock)
        web_calls = [c for c in mock.calls if c[0] == "web_render"]
        assert len(web_calls) == 2  # 2 URLs in SAMPLE_ARTICLE


# ─────────────────────────────────────────────────────────────────────────────
# EDGE CASE TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestEdgeCases:
    def test_empty_source_urls_rejected_immediately(self, contract):
        """Empty source_urls raises exception before any AI call."""
        article = {**SAMPLE_ARTICLE, "article_id": "article-empty", "source_urls": "[]"}
        with pytest.raises(Exception, match="cannot be empty"):
            contract.submit_article(**article)

    def test_invalid_source_url_format(self, contract):
        """Non-http URL raises exception."""
        article = {
            **SAMPLE_ARTICLE,
            "article_id": "article-badurl",
            "source_urls": json.dumps(["ftp://invalid.com/file"]),
        }
        with pytest.raises(Exception, match="Invalid URL format"):
            contract.submit_article(**article)

    def test_too_many_source_urls(self, contract):
        """More than 10 URLs raises exception."""
        urls = [f"https://example.com/source{i}" for i in range(11)]
        article = {**SAMPLE_ARTICLE, "article_id": "article-manyurls", "source_urls": json.dumps(urls)}
        with pytest.raises(Exception, match="Maximum 10"):
            contract.submit_article(**article)

    def test_all_urls_fetch_fail_yields_rejected(self, contract):
        """When all URLs fail to fetch, AI should return REJECTED."""
        contract.submit_article(**SAMPLE_ARTICLE)
        dead_responses = {url: None for url in json.loads(SAMPLE_ARTICLE["source_urls"])}
        mock = MockNondet(web_responses=dead_responses, llm_response=ALL_FAILED_LLM_RESPONSE)
        verdict = contract._run_verification("article-001", mock)
        assert verdict == "REJECTED"

    def test_verify_nonexistent_article(self, contract):
        """Verifying unknown article raises exception."""
        with pytest.raises(Exception, match="not found"):
            contract._run_verification("nonexistent-id", MockNondet(llm_response=GOOD_LLM_RESPONSE))

    def test_verify_already_verified_fails(self, contract):
        """Cannot verify an already-VERIFIED article."""
        contract.submit_article(**SAMPLE_ARTICLE)
        mock = MockNondet(llm_response=GOOD_LLM_RESPONSE)
        contract._run_verification("article-001", mock)
        mock2 = MockNondet(llm_response=GOOD_LLM_RESPONSE)
        with pytest.raises(Exception, match="already in state"):
            contract._run_verification("article-001", mock2)

    def test_short_article_text_rejected(self, contract):
        """Article text under 50 chars is rejected at submission."""
        article = {**SAMPLE_ARTICLE, "article_id": "article-short", "article_text": "Too short."}
        with pytest.raises(Exception, match="at least 50 characters"):
            contract.submit_article(**article)

    def test_malformed_source_urls_json(self, contract):
        """Malformed source_urls JSON raises exception."""
        article = {
            **SAMPLE_ARTICLE,
            "article_id": "article-badjson",
            "source_urls": "not valid json",
        }
        with pytest.raises(Exception, match="valid JSON array"):
            contract.submit_article(**article)

    def test_source_urls_not_array(self, contract):
        """source_urls as JSON object (not array) raises exception."""
        article = {
            **SAMPLE_ARTICLE,
            "article_id": "article-notarray",
            "source_urls": '{"url": "https://example.com"}',
        }
        with pytest.raises(Exception, match="JSON array"):
            contract.submit_article(**article)


# ─────────────────────────────────────────────────────────────────────────────
# VALIDATOR SEMANTIC TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestValidatorFn:
    """These tests directly verify the validator_fn semantic logic."""

    def test_valid_verified_result_passes(self, contract):
        """Well-formed VERIFIED result passes validation."""
        assert contract.validator_fn(GOOD_LLM_RESPONSE) is True

    def test_valid_rejected_result_passes(self, contract):
        """Well-formed REJECTED result passes validation."""
        assert contract.validator_fn(REJECTED_LLM_RESPONSE) is True

    def test_invalid_verdict_string_fails(self, contract):
        """Verdict must be exactly VERIFIED or REJECTED."""
        bad = {**GOOD_LLM_RESPONSE, "verdict": "APPROVED"}
        assert contract.validator_fn(bad) is False

    def test_source_accuracy_out_of_range_fails(self, contract):
        """source_accuracy must be 0.0-1.0."""
        bad = {**GOOD_LLM_RESPONSE, "source_accuracy": 1.5}
        assert contract.validator_fn(bad) is False

    def test_ai_risk_out_of_range_fails(self, contract):
        """ai_generated_risk must be 0.0-1.0."""
        bad = {**GOOD_LLM_RESPONSE, "ai_generated_risk": -0.1}
        assert contract.validator_fn(bad) is False

    def test_context_integrity_wrong_type_fails(self, contract):
        """context_integrity must be a boolean, not a string."""
        bad = {**GOOD_LLM_RESPONSE, "context_integrity": "yes"}
        assert contract.validator_fn(bad) is False

    def test_logical_inconsistency_low_accuracy_verified_fails(self, contract):
        """source_accuracy < 0.7 but verdict VERIFIED is logically inconsistent."""
        bad = {**GOOD_LLM_RESPONSE, "source_accuracy": 0.5, "verdict": "VERIFIED"}
        assert contract.validator_fn(bad) is False

    def test_logical_inconsistency_high_ai_risk_verified_fails(self, contract):
        """ai_generated_risk > 0.6 but verdict VERIFIED is logically inconsistent."""
        bad = {**GOOD_LLM_RESPONSE, "ai_generated_risk": 0.8, "verdict": "VERIFIED"}
        assert contract.validator_fn(bad) is False

    def test_logical_inconsistency_bad_context_verified_fails(self, contract):
        """context_integrity=false but verdict VERIFIED is logically inconsistent."""
        bad = {**GOOD_LLM_RESPONSE, "context_integrity": False, "verdict": "VERIFIED"}
        assert contract.validator_fn(bad) is False

    def test_empty_reason_fails(self, contract):
        """reason must be a non-empty string."""
        bad = {**GOOD_LLM_RESPONSE, "reason": ""}
        assert contract.validator_fn(bad) is False

    def test_missing_verdict_field_fails(self, contract):
        """Missing verdict field fails validation."""
        bad = {k: v for k, v in GOOD_LLM_RESPONSE.items() if k != "verdict"}
        assert contract.validator_fn(bad) is False

    def test_non_dict_result_fails(self, contract):
        """Non-dict result (e.g. string) fails validation."""
        assert contract.validator_fn("VERIFIED") is False
        assert contract.validator_fn(None) is False
        assert contract.validator_fn([]) is False


# ─────────────────────────────────────────────────────────────────────────────
# VIEW METHOD TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestViewMethods:
    def test_get_all_verified_empty_initially(self, contract):
        """No verified articles initially."""
        result = json.loads(contract.get_all_verified()) if hasattr(contract, "get_all_verified") else []
        # Just checking the verified_ids list is empty
        assert contract.verified_ids == []

    def test_verified_ids_populated_after_verify(self, contract):
        """After VERIFIED verdict, article appears in verified_ids."""
        contract.submit_article(**SAMPLE_ARTICLE)
        mock = MockNondet(llm_response=GOOD_LLM_RESPONSE)
        contract._run_verification("article-001", mock)
        assert "article-001" in contract.verified_ids

    def test_rejected_not_in_verified_ids(self, contract):
        """REJECTED articles don't appear in verified_ids."""
        contract.submit_article(**SAMPLE_ARTICLE)
        mock = MockNondet(llm_response=REJECTED_LLM_RESPONSE)
        contract._run_verification("article-001", mock)
        assert "article-001" not in contract.verified_ids

    def test_get_nonexistent_article_status(self, contract):
        """Non-existent article status returns None (NOT_FOUND)."""
        assert contract.statuses.get("nonexistent") is None


# ─────────────────────────────────────────────────────────────────────────────
# INTEGRATION-STYLE TESTS (Multi-article flow)
# ─────────────────────────────────────────────────────────────────────────────


class TestIntegrationFlow:
    def test_multiple_articles_independent(self, contract):
        """Multiple articles are verified independently."""
        for i in range(3):
            article = {
                **SAMPLE_ARTICLE,
                "article_id": f"article-{i:03d}",
                "article_hash": f"sha256:hash{i:040d}",
            }
            contract.submit_article(**article)

        mock = MockNondet(llm_response=GOOD_LLM_RESPONSE)
        for i in range(3):
            contract._run_verification(f"article-{i:03d}", mock)

        assert len(contract.verified_ids) == 3
        assert contract.submission_count == 3

    def test_mix_of_verified_and_rejected(self, contract):
        """Feed only contains VERIFIED articles."""
        for i in range(3):
            article = {
                **SAMPLE_ARTICLE,
                "article_id": f"article-{i:03d}",
                "article_hash": f"sha256:hash{i:040d}",
            }
            contract.submit_article(**article)

        responses = [GOOD_LLM_RESPONSE, REJECTED_LLM_RESPONSE, GOOD_LLM_RESPONSE]
        for i, resp in enumerate(responses):
            mock = MockNondet(llm_response=resp)
            contract._run_verification(f"article-{i:03d}", mock)

        # Only 2 verified
        assert len(contract.verified_ids) == 2
        assert "article-001" not in contract.verified_ids


def get_all_verified(contract):
    """Helper to simulate get_all_verified() logic."""
    return [
        aid for aid in contract.verified_ids
        if contract.statuses.get(aid) == "VERIFIED"
    ]
