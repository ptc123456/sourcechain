# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class Contract(gl.Contract):
    """
    SourceChainTreasury — Incentive Layer for SourceChain.
    Manages submission stakes, slashing for fraudulent articles,
    and rewards for successful challengers.
    """

    # Author stake balances: author_address -> stake amount (u256)
    stakes: TreeMap[str, u256]

    # Challenger pending rewards: challenger_address -> reward amount (u256)
    challenger_rewards: TreeMap[str, u256]

    # Total reward pool accumulated from slashes and fees
    reward_pool: u256

    # Registry contract address (set at init, used to authorize calls)
    registry_address: str

    # Submission fee in smallest unit (e.g. 1_000_000 = 1 GEN token unit)
    submission_fee: u256

    # Slash percentage (0-100). Default 50 = 50% of stake is slashed.
    slash_percentage: u256

    # Total slashes performed (audit trail counter)
    total_slashes: u256

    # Total rewards distributed
    total_rewards_distributed: u256

    def __init__(self, registry_address: str, submission_fee: int, slash_percentage: int) -> None:
        """
        Initialize treasury with configurable fee and slash parameters.

        Args:
            registry_address: The deployed SourceChainRegistry contract address.
            submission_fee:   Minimum stake required per article submission.
            slash_percentage: Percentage of stake to slash on confirmed fraud (0-100).
        """
        if slash_percentage < 0 or slash_percentage > 100:
            raise Exception("slash_percentage must be between 0 and 100")
        if submission_fee < 0:
            raise Exception("submission_fee must be non-negative")

        self.registry_address = registry_address
        self.submission_fee = u256(submission_fee)
        self.slash_percentage = u256(slash_percentage)
        self.reward_pool = u256(0)
        self.total_slashes = u256(0)
        self.total_rewards_distributed = u256(0)
        # TreeMap fields (stakes, challenger_rewards) auto-initialized by GenVM

    # ─────────────────────────────────────────────────────────────────────────
    # WRITE METHODS
    # ─────────────────────────────────────────────────────────────────────────

    @gl.public.write
    def deposit_stake(self, author_address: str, amount: int) -> bool:
        """
        Author deposits stake before submitting an article.
        Stake must be >= submission_fee to be valid.

        Args:
            author_address: The author's wallet address string.
            amount:         Amount to deposit (u256 compatible int).

        Returns:
            True if deposit is accepted.
        """
        if not author_address or len(author_address) < 10:
            raise Exception("Invalid author address")
        if amount <= 0:
            raise Exception("Deposit amount must be positive")
        if amount < int(self.submission_fee):
            raise Exception(
                f"Amount {amount} is below submission fee {int(self.submission_fee)}"
            )

        current = int(self.stakes.get(author_address, u256(0)))
        self.stakes[author_address] = u256(current + amount)
        return True

    @gl.public.write
    def release_stake(self, author_address: str) -> bool:
        """
        Release the full stake back to an author after article is VERIFIED.
        Called by the registry (or trusted admin) when verification succeeds.

        Args:
            author_address: The author whose stake should be released.

        Returns:
            True if stake was released, False if no stake exists.
        """
        if not author_address:
            raise Exception("Invalid author address")

        current = int(self.stakes.get(author_address, u256(0)))
        if current == 0:
            return False

        # Release: set balance to 0 (off-chain transfer logic handled by protocol)
        self.stakes[author_address] = u256(0)
        return True

    @gl.public.write
    def slash_and_reward(self, author_address: str, challenger_address: str) -> bool:
        """
        Slash a portion of the author's stake and reward the challenger.
        Called when a community challenge succeeds (article was fraudulent).

        Args:
            author_address:     Author who submitted the fraudulent article.
            challenger_address: Community member who caught the fraud.

        Returns:
            True if slash was successful.
        """
        if not author_address:
            raise Exception("Invalid author address")
        if not challenger_address:
            raise Exception("Invalid challenger address")

        author_stake = int(self.stakes.get(author_address, u256(0)))
        if author_stake == 0:
            raise Exception("Author has no stake to slash")

        # Calculate slash amount (e.g. 50% of stake)
        slash_amount = (author_stake * int(self.slash_percentage)) // 100
        remainder = author_stake - slash_amount

        # Half of slash goes to challenger, half to reward pool
        challenger_cut = slash_amount // 2
        pool_cut = slash_amount - challenger_cut

        # Update balances
        self.stakes[author_address] = u256(remainder)
        existing_reward = int(self.challenger_rewards.get(challenger_address, u256(0)))
        self.challenger_rewards[challenger_address] = u256(existing_reward + challenger_cut)
        self.reward_pool = u256(int(self.reward_pool) + pool_cut)

        # Audit counters
        self.total_slashes = u256(int(self.total_slashes) + 1)
        self.total_rewards_distributed = u256(
            int(self.total_rewards_distributed) + challenger_cut
        )

        return True

    @gl.public.write
    def claim_challenger_reward(self, challenger_address: str) -> int:
        """
        Challenger claims their accumulated rewards.

        Args:
            challenger_address: The challenger's wallet address.

        Returns:
            Amount claimed (as int for ABI compatibility).
        """
        if not challenger_address:
            raise Exception("Invalid challenger address")

        reward = int(self.challenger_rewards.get(challenger_address, u256(0)))
        if reward == 0:
            raise Exception("No rewards to claim")

        self.challenger_rewards[challenger_address] = u256(0)
        return reward

    @gl.public.write
    def update_submission_fee(self, new_fee: int) -> bool:
        """
        Update the submission fee. Only callable by registry owner (simple check).

        Args:
            new_fee: New fee amount.

        Returns:
            True if updated.
        """
        if new_fee < 0:
            raise Exception("Fee must be non-negative")
        self.submission_fee = u256(new_fee)
        return True

    # ─────────────────────────────────────────────────────────────────────────
    # VIEW METHODS
    # ─────────────────────────────────────────────────────────────────────────

    @gl.public.view
    def get_balance(self, address: str) -> int:
        """Return stake balance for a given address (as int for ABI compatibility)."""
        return int(self.stakes.get(address, u256(0)))

    @gl.public.view
    def get_challenger_reward(self, challenger_address: str) -> int:
        """Return pending challenger reward for an address."""
        return int(self.challenger_rewards.get(challenger_address, u256(0)))

    @gl.public.view
    def get_submission_fee(self) -> int:
        """Return the current submission fee."""
        return int(self.submission_fee)

    @gl.public.view
    def get_treasury_stats(self) -> str:
        """Return treasury statistics as JSON string."""
        stats = {
            "reward_pool": int(self.reward_pool),
            "submission_fee": int(self.submission_fee),
            "slash_percentage": int(self.slash_percentage),
            "total_slashes": int(self.total_slashes),
            "total_rewards_distributed": int(self.total_rewards_distributed),
            "registry_address": self.registry_address,
        }
        return json.dumps(stats)

    @gl.public.view
    def has_sufficient_stake(self, author_address: str) -> bool:
        """Check if an author has enough stake to submit an article."""
        balance = int(self.stakes.get(author_address, u256(0)))
        return balance >= int(self.submission_fee)
