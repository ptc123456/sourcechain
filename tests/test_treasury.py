"""
test_treasury.py — Tests for SourceChainTreasury

Tests: stake deposit, release, slash/reward mechanics, claim, admin operations.

Run with: python -m pytest tests/test_treasury.py -v
"""

import json
import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Mock Contract
# ─────────────────────────────────────────────────────────────────────────────


class MockTreasury:
    """
    Mock of SourceChainTreasury for offline unit testing.
    Replicates business logic without GenLayer primitives.
    """

    def __init__(self, registry_address="0xREGISTRY", submission_fee=1_000_000, slash_percentage=50):
        if slash_percentage < 0 or slash_percentage > 100:
            raise Exception("slash_percentage must be between 0 and 100")
        if submission_fee < 0:
            raise Exception("submission_fee must be non-negative")

        self.registry_address = registry_address
        self.submission_fee = submission_fee
        self.slash_percentage = slash_percentage
        self.stakes = {}  # address -> int
        self.challenger_rewards = {}  # address -> int
        self.reward_pool = 0
        self.total_slashes = 0
        self.total_rewards_distributed = 0

    def deposit_stake(self, author_address, amount):
        if not author_address or len(author_address) < 10:
            raise Exception("Invalid author address")
        if amount <= 0:
            raise Exception("Deposit amount must be positive")
        if amount < self.submission_fee:
            raise Exception(f"Amount {amount} is below submission fee {self.submission_fee}")

        self.stakes[author_address] = self.stakes.get(author_address, 0) + amount
        return True

    def release_stake(self, author_address):
        if not author_address:
            raise Exception("Invalid author address")

        current = self.stakes.get(author_address, 0)
        if current == 0:
            return False

        self.stakes[author_address] = 0
        return True

    def slash_and_reward(self, author_address, challenger_address):
        if not author_address:
            raise Exception("Invalid author address")
        if not challenger_address:
            raise Exception("Invalid challenger address")

        author_stake = self.stakes.get(author_address, 0)
        if author_stake == 0:
            raise Exception("Author has no stake to slash")

        slash_amount = (author_stake * self.slash_percentage) // 100
        remainder = author_stake - slash_amount
        challenger_cut = slash_amount // 2
        pool_cut = slash_amount - challenger_cut

        self.stakes[author_address] = remainder
        self.challenger_rewards[challenger_address] = (
            self.challenger_rewards.get(challenger_address, 0) + challenger_cut
        )
        self.reward_pool += pool_cut
        self.total_slashes += 1
        self.total_rewards_distributed += challenger_cut

        return True

    def claim_challenger_reward(self, challenger_address):
        if not challenger_address:
            raise Exception("Invalid challenger address")
        reward = self.challenger_rewards.get(challenger_address, 0)
        if reward == 0:
            raise Exception("No rewards to claim")
        self.challenger_rewards[challenger_address] = 0
        return reward

    def get_balance(self, address):
        return self.stakes.get(address, 0)

    def get_challenger_reward(self, challenger_address):
        return self.challenger_rewards.get(challenger_address, 0)

    def get_submission_fee(self):
        return self.submission_fee

    def has_sufficient_stake(self, author_address):
        return self.stakes.get(author_address, 0) >= self.submission_fee

    def get_treasury_stats(self):
        return json.dumps({
            "reward_pool": self.reward_pool,
            "submission_fee": self.submission_fee,
            "slash_percentage": self.slash_percentage,
            "total_slashes": self.total_slashes,
            "total_rewards_distributed": self.total_rewards_distributed,
        })

    def update_submission_fee(self, new_fee):
        if new_fee < 0:
            raise Exception("Fee must be non-negative")
        self.submission_fee = new_fee
        return True


# ─────────────────────────────────────────────────────────────────────────────
# FIXTURES
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def treasury():
    return MockTreasury(
        registry_address="0xRegistryAddress123",
        submission_fee=1_000_000,
        slash_percentage=50,
    )


AUTHOR = "0xAuthorAddress123456789"
CHALLENGER = "0xChallengerAddress456789"


# ─────────────────────────────────────────────────────────────────────────────
# INIT TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestInit:
    def test_initial_state(self, treasury):
        """Treasury initializes with correct default state."""
        assert treasury.reward_pool == 0
        assert treasury.total_slashes == 0
        assert treasury.submission_fee == 1_000_000

    def test_invalid_slash_percentage_high(self):
        """slash_percentage > 100 raises exception."""
        with pytest.raises(Exception, match="between 0 and 100"):
            MockTreasury(slash_percentage=101)

    def test_invalid_slash_percentage_low(self):
        """slash_percentage < 0 raises exception."""
        with pytest.raises(Exception, match="between 0 and 100"):
            MockTreasury(slash_percentage=-1)

    def test_invalid_submission_fee(self):
        """Negative submission_fee raises exception."""
        with pytest.raises(Exception, match="non-negative"):
            MockTreasury(submission_fee=-100)


# ─────────────────────────────────────────────────────────────────────────────
# DEPOSIT STAKE TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestDepositStake:
    def test_deposit_success(self, treasury):
        """Valid deposit updates balance."""
        result = treasury.deposit_stake(AUTHOR, 2_000_000)
        assert result is True
        assert treasury.get_balance(AUTHOR) == 2_000_000

    def test_deposit_below_fee_fails(self, treasury):
        """Deposit below submission_fee raises exception."""
        with pytest.raises(Exception, match="below submission fee"):
            treasury.deposit_stake(AUTHOR, 500_000)

    def test_deposit_zero_fails(self, treasury):
        """Zero deposit raises exception."""
        with pytest.raises(Exception, match="must be positive"):
            treasury.deposit_stake(AUTHOR, 0)

    def test_deposit_negative_fails(self, treasury):
        """Negative deposit raises exception."""
        with pytest.raises(Exception, match="must be positive"):
            treasury.deposit_stake(AUTHOR, -100)

    def test_deposit_invalid_address_fails(self, treasury):
        """Short/empty address raises exception."""
        with pytest.raises(Exception, match="Invalid author address"):
            treasury.deposit_stake("short", 2_000_000)

    def test_deposit_accumulates(self, treasury):
        """Multiple deposits to the same address accumulate."""
        treasury.deposit_stake(AUTHOR, 1_000_000)
        treasury.deposit_stake(AUTHOR, 1_000_000)
        assert treasury.get_balance(AUTHOR) == 2_000_000

    def test_has_sufficient_stake_true(self, treasury):
        """Author with stake >= fee is sufficient."""
        treasury.deposit_stake(AUTHOR, 1_000_000)
        assert treasury.has_sufficient_stake(AUTHOR) is True

    def test_has_sufficient_stake_false(self, treasury):
        """Author with no deposit is insufficient."""
        assert treasury.has_sufficient_stake(AUTHOR) is False


# ─────────────────────────────────────────────────────────────────────────────
# RELEASE STAKE TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestReleaseStake:
    def test_release_success(self, treasury):
        """Successful release sets balance to 0."""
        treasury.deposit_stake(AUTHOR, 2_000_000)
        result = treasury.release_stake(AUTHOR)
        assert result is True
        assert treasury.get_balance(AUTHOR) == 0

    def test_release_no_stake_returns_false(self, treasury):
        """Releasing when no stake exists returns False (not an error)."""
        result = treasury.release_stake(AUTHOR)
        assert result is False

    def test_release_then_deposit_works(self, treasury):
        """After release, author can stake again."""
        treasury.deposit_stake(AUTHOR, 1_000_000)
        treasury.release_stake(AUTHOR)
        treasury.deposit_stake(AUTHOR, 1_500_000)
        assert treasury.get_balance(AUTHOR) == 1_500_000


# ─────────────────────────────────────────────────────────────────────────────
# SLASH AND REWARD TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestSlashAndReward:
    def test_slash_50_percent(self, treasury):
        """50% slash: author loses half, challenger gets 25%, pool gets 25%."""
        treasury.deposit_stake(AUTHOR, 2_000_000)
        result = treasury.slash_and_reward(AUTHOR, CHALLENGER)
        assert result is True

        # Author had 2M, 50% slashed = 1M slash
        assert treasury.get_balance(AUTHOR) == 1_000_000

        # Challenger gets 50% of slash = 500K
        assert treasury.get_challenger_reward(CHALLENGER) == 500_000

        # Pool gets remaining 50% of slash = 500K
        assert treasury.reward_pool == 500_000

    def test_slash_increments_counter(self, treasury):
        """Total slash counter increments after slash."""
        treasury.deposit_stake(AUTHOR, 1_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)
        assert treasury.total_slashes == 1

    def test_slash_tracks_rewards_distributed(self, treasury):
        """total_rewards_distributed tracks challenger payouts."""
        treasury.deposit_stake(AUTHOR, 2_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)
        assert treasury.total_rewards_distributed == 500_000  # 25% of 2M

    def test_slash_no_stake_fails(self, treasury):
        """Slashing author with no stake raises exception."""
        with pytest.raises(Exception, match="no stake to slash"):
            treasury.slash_and_reward(AUTHOR, CHALLENGER)

    def test_slash_100_percent(self):
        """100% slash: author loses everything, challenger gets half."""
        t = MockTreasury(slash_percentage=100)
        t.deposit_stake(AUTHOR, 1_000_000)
        t.slash_and_reward(AUTHOR, CHALLENGER)
        assert t.get_balance(AUTHOR) == 0
        assert t.get_challenger_reward(CHALLENGER) == 500_000
        assert t.reward_pool == 500_000

    def test_slash_0_percent(self):
        """0% slash: no stake removed, no reward generated."""
        t = MockTreasury(slash_percentage=0)
        t.deposit_stake(AUTHOR, 1_000_000)
        t.slash_and_reward(AUTHOR, CHALLENGER)
        assert t.get_balance(AUTHOR) == 1_000_000
        assert t.get_challenger_reward(CHALLENGER) == 0
        assert t.reward_pool == 0

    def test_multiple_challengers_independent(self, treasury):
        """Each challenger's reward is tracked independently."""
        challenger2 = "0xChallengerTwo456789ABC"
        treasury.deposit_stake(AUTHOR, 2_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)
        # Author now has 1M left, slash again
        treasury.slash_and_reward(AUTHOR, challenger2)
        assert treasury.get_challenger_reward(CHALLENGER) == 500_000
        assert treasury.get_challenger_reward(challenger2) == 250_000  # 50% of 50% of 1M

    def test_invalid_author_address_fails(self, treasury):
        """Empty author address raises exception."""
        with pytest.raises(Exception, match="Invalid author address"):
            treasury.slash_and_reward("", CHALLENGER)

    def test_invalid_challenger_address_fails(self, treasury):
        """Empty challenger address raises exception."""
        treasury.deposit_stake(AUTHOR, 1_000_000)
        with pytest.raises(Exception, match="Invalid challenger address"):
            treasury.slash_and_reward(AUTHOR, "")


# ─────────────────────────────────────────────────────────────────────────────
# CLAIM REWARD TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestClaimReward:
    def test_claim_success(self, treasury):
        """Challenger claims reward after successful slash."""
        treasury.deposit_stake(AUTHOR, 2_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)
        claimed = treasury.claim_challenger_reward(CHALLENGER)
        assert claimed == 500_000

    def test_claim_clears_balance(self, treasury):
        """After claiming, challenger reward balance is 0."""
        treasury.deposit_stake(AUTHOR, 2_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)
        treasury.claim_challenger_reward(CHALLENGER)
        assert treasury.get_challenger_reward(CHALLENGER) == 0

    def test_claim_nothing_fails(self, treasury):
        """Claiming when no reward exists raises exception."""
        with pytest.raises(Exception, match="No rewards to claim"):
            treasury.claim_challenger_reward(CHALLENGER)

    def test_double_claim_fails(self, treasury):
        """Cannot claim twice."""
        treasury.deposit_stake(AUTHOR, 2_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)
        treasury.claim_challenger_reward(CHALLENGER)
        with pytest.raises(Exception, match="No rewards to claim"):
            treasury.claim_challenger_reward(CHALLENGER)


# ─────────────────────────────────────────────────────────────────────────────
# STATS TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestTreasuryStats:
    def test_stats_json_format(self, treasury):
        """get_treasury_stats returns valid JSON."""
        stats_json = treasury.get_treasury_stats()
        stats = json.loads(stats_json)
        assert "reward_pool" in stats
        assert "submission_fee" in stats
        assert "slash_percentage" in stats
        assert "total_slashes" in stats
        assert "total_rewards_distributed" in stats

    def test_stats_reflect_operations(self, treasury):
        """Stats accurately reflect operations performed."""
        treasury.deposit_stake(AUTHOR, 2_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)

        stats = json.loads(treasury.get_treasury_stats())
        assert stats["total_slashes"] == 1
        assert stats["reward_pool"] == 500_000
        assert stats["total_rewards_distributed"] == 500_000

    def test_update_submission_fee(self, treasury):
        """Submission fee can be updated."""
        treasury.update_submission_fee(2_000_000)
        assert treasury.get_submission_fee() == 2_000_000

    def test_update_fee_negative_fails(self, treasury):
        """Negative fee raises exception."""
        with pytest.raises(Exception, match="non-negative"):
            treasury.update_submission_fee(-1)


# ─────────────────────────────────────────────────────────────────────────────
# INTEGRATION FLOW TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestIntegrationFlow:
    def test_full_happy_path(self, treasury):
        """
        Full happy path:
        1. Author deposits stake
        2. Article gets VERIFIED
        3. Stake is released back to author
        """
        treasury.deposit_stake(AUTHOR, 1_500_000)
        assert treasury.has_sufficient_stake(AUTHOR) is True

        # After verification → release
        treasury.release_stake(AUTHOR)
        assert treasury.get_balance(AUTHOR) == 0

    def test_full_fraud_path(self, treasury):
        """
        Full fraud path:
        1. Author deposits stake
        2. Article gets VERIFIED (incorrectly)
        3. Challenger finds fraud
        4. Slash + reward
        5. Challenger claims
        """
        treasury.deposit_stake(AUTHOR, 2_000_000)
        treasury.slash_and_reward(AUTHOR, CHALLENGER)
        claimed = treasury.claim_challenger_reward(CHALLENGER)

        assert claimed == 500_000
        assert treasury.get_balance(AUTHOR) == 1_000_000  # 50% remaining
        assert treasury.reward_pool == 500_000

    def test_multiple_authors_independent(self, treasury):
        """Multiple authors' stakes are independent."""
        author2 = "0xAuthorTwo456789ABCDEF"
        treasury.deposit_stake(AUTHOR, 1_000_000)
        treasury.deposit_stake(author2, 3_000_000)

        assert treasury.get_balance(AUTHOR) == 1_000_000
        assert treasury.get_balance(author2) == 3_000_000

        treasury.release_stake(AUTHOR)
        assert treasury.get_balance(AUTHOR) == 0
        assert treasury.get_balance(author2) == 3_000_000
