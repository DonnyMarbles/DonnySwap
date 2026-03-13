# DonnySwap Tokenomics Architecture

## Token Summary

- **MRBL**: 1M fixed supply. Utility token — LP pairing for DSFO minting, governance.
- **DSFO NFT**: Soulbound fractional ownership. No hard cap, linear pricing on active supply. Minted with MRBL-PEAQ LP.
- **PEAQ/WPEAQ**: Native chain token. Base pair for major tokens.

## DSFO NFT Model

### Minting
- **Price**: `basePrice + (activeSupply * priceStep)` — tracks living NFTs, not total ever minted
- **LP split**: 70% burned (permanent liquidity) / 30% locked in LPVault
- **Burn/lock ratio**: Adjustable by governance (48-hour timelock)
- **No hard cap**: Market self-caps when mint cost exceeds expected fee return
- **Soulbound (ERC-5192)**: No transfers. Only mint or redeem.

### Redemption (Soulbound Exit)
- Holders burn their DSFO NFT to receive LP tokens back from the LPVault
- **Formula**: `redemptionAmount = min(timeWeight * originalMintCost, vaultProRataShare)`
- **Pro-rata includes 20% reserve**: `vaultProRataShare = (vault.totalLP * 0.8) * (nftMintCost / totalActiveMintCost)`
- **Time-weighted curve** (smooth linear interpolation):
  - `timeWeight = min(0.8, 0.8 * daysSinceMint / 365)`
  - Day 0: 0%, Day 365+: 80% (capped)
- **Sliding redemption fee** (smooth linear interpolation):
  - `fee = max(3%, 20% - (17% * min(daysSinceMint, 365) / 365))`
  - Day 0: 20%, Day 365+: 3%, continuous in between
- Fee split: 50% stays in vault, 50% LP burned
- **20% vault reserve**: Baked into pro-rata formula, not a threshold. Deterministic regardless of redemption ordering.
- **48-hour cooldown** between redemption transactions per address
- **Unredeemed portion** stays in vault, benefiting remaining holders

### Pricing Dynamics
- Redemptions lower `activeSupply` → price drops → creates re-entry points for new minters
- Minting raises `activeSupply` → price rises → natural demand throttle
- System breathes: expands with demand, contracts with redemptions
- **Anti-gaming**: Redeem-to-cheapen-then-remint is unprofitable because:
  - 70% of original LP is permanently burned
  - Time-weight resets to 0% on new mint
  - Up to 20% redemption fee
  - Net loss every cycle

### Effective Redemption Math (Day 365, Best Case Without Fee Income)
- Time weight: 80% of original mint cost `P`
- Vault holds ≥30% of `P` per NFT (pro-rata may exceed this as vault grows from trading fees)
- After 3% fee: up to ~29.1% of `P` returned (more if vault has grown)
- Permanent cost: ≥70.9% of `P` (burned LP)
- Fee income over hold period is the reward for that cost

## Two Revenue Streams

### Stream 1: FeeSplitter → FeeManager (DSFO Holder Fees)
- **Input**: LP tokens from V2 protocol fees (Factory `feeTo` → FeeSplitter)
- **FeeSplitter routing** (pair-aware):
  - **MRBL-PEAQ pair LP**: 70% → FeeManager, 30% → LPVault
  - **All other pair LP**: 100% → FeeManager
- **FeeManager process**: `triggerBreakdownAndDistribution()` removes liquidity, accumulates rewards per share
- **Output**: Underlying tokens (MRBL, WPEAQ, etc.) claimable by DSFO holders
- **Beneficiary**: DSFO NFT holders (proportional to NFT count — equal weight, rewarding early adopters)
- **Mandatory**: Enforced at the V2 Pair contract level. Cannot be bypassed regardless of which router or interface is used.
- **Trigger**: Permissionless with minimum interval and minimum LP balance threshold. 1% caller bounty (capped at max amount set by governance).

### Stream 2: FeeSplitter → LPVault + DSFO Minting → LPVault
- **Input A**: 30% of MRBL-PEAQ LP tokens from FeeSplitter (only MRBL-PEAQ pair, not other pairs)
- **Input B**: 30% of LP tokens from every DSFO mint (on each mint event)
- **The vault holds only MRBL-PEAQ LP**: same token type minters deposited, keeping redemptions clean and fungible
- **The vault grows from two sources**: MRBL-PEAQ trading fees AND minting activity
- **Output via harvest** (permissionless, 7-day minimum interval, capped caller bounty):
  - LP tokens remain in vault (compound via pool fees automatically)
  - DSFO holder bonuses (transfer portion of vault LP to FeeManager for distribution)
  - Protocol treasury
- **Output via redemption**: LP returned to redeeming DSFO holders
- **Adaptive harvest allocation** (based on vault health vs target):
  - Vault above 80% of target: 60% retain / 25% DSFO bonus / 15% treasury
  - Vault at 50-80% of target: 80% retain / 12% DSFO bonus / 8% treasury
  - Vault below 50% of target: 95% retain / 3% DSFO bonus / 2% treasury
- **Vault target**: `0.3 * sum(all active NFT mint costs)` — rolling, adjusts with mints and redemptions

## Flow Diagram

```
                    ┌──────────────────────┐
  ALL traders       │   Uniswap V2 Pairs   │
  (any router,      │   (0.3% fee stays     │
   any interface)   │    in pool reserves)  │
  ─────────────────►│                       │
                    └──────────┬────────────┘
                               │
                      Protocol fee (~0.05%)
                      LP tokens minted to feeTo
                               │
                               ▼
                    ┌──────────────────────┐
                    │     FeeSplitter       │
                    │   (feeTo address)     │
                    │                       │
                    │  MRBL-PEAQ LP:        │
                    │    70% → FeeManager   │
                    │    30% → LPVault      │
                    │                       │
                    │  All other LP:        │
                    │    100% → FeeManager  │
                    └─────┬──────────┬─────┘
                          │          │
                          ▼          ▼
               ┌─────────────┐  ┌──────────────┐
               │ FeeManager  │  │   LPVault    │
               │ (break LP,  │  │ (MRBL-PEAQ   │
               │  distribute │  │  LP only,    │
               │  to DSFO    │  │  backs       │
               │  holders)   │  │  redemptions)│
               └─────────────┘  └──────────────┘
                                       ▲
                                       │
                    ┌──────────────────────┐
  DSFO minting     │    DSFO_mint_v3      │
  ──────── 30% ───►│  (70% LP burned,     │
  of mint LP       │   30% to LPVault)    │
  (MRBL-PEAQ LP)   └──────────────────────┘


  LPVault Outputs:
  ┌──────────────────────────────────────────┐
  │                LPVault                    │
  │                                           │
  │  ┌─── Harvest (7-day, permissionless) ──┐│
  │  │  Retain (adaptive %) — LP compounds  ││
  │  │  DSFO Bonus → FeeManager → holders   ││
  │  │  Treasury → protocol multisig        ││
  │  └─────────────────────────────────────-┘│
  │                                           │
  │  ┌─── Redemption ──────────────────────┐ │
  │  │  DSFO holder burns NFT              │ │
  │  │  Receives LP back (time-weighted,   │ │
  │  │  pro-rata, sliding fee)             │ │
  │  └────────────────────────────────────-┘ │
  └──────────────────────────────────────────┘
```

## MRBL Utility

1. **LP pairing**: Required to mint DSFO (paired with PEAQ for LP). Primary demand driver.
2. **Indirect deflation**: MRBL inside burned LP tokens (70% of DSFO mints) is permanently locked in the pool. Reduces free-floating supply over time.
3. **Governance weight**: Snapshot voting → eventually on-chain Governor.
4. **Staking for boosted fees**: Stake MRBL for multiplied DSFO fee claims (Phase 2).

## MRBL Circulation Model

```
MRBL leaves circulation via:
  - LP creation for DSFO minting (locked in pool via burn or vault)

MRBL re-enters circulation via:
  - LPVault harvests (LP broken down returns MRBL + WPEAQ)
  - LPVault redemptions (LP returned to redeemers contains MRBL)
  - FeeManager distributions (broken-down LP contains MRBL)
```

- DSFO minting drives MRBL demand (need MRBL to create LP)
- Stronger vault → more attractive DSFO → more minting → more MRBL demand
- As MRBL becomes scarcer, DSFO minting becomes more expensive, naturally throttling supply
- Equilibrium: mint rate stabilizes where fee income justifies mint cost

## Anti-Gaming Mechanisms

| Mechanism | Protects Against |
|-----------|-----------------|
| Soulbound NFTs (ERC-5192) | Claim sniping, secondary market speculation |
| Smooth time-weighted redemption (0→80% over 365 days) | Mint-and-flip, impulsive redemption |
| Smooth sliding redemption fee (20% → 3% over time) | Short-term extraction, cliff gaming |
| 20% vault reserve (baked into pro-rata formula) | Bank-run vault drainage, race conditions |
| 48-hour redemption cooldown per address | Bot-driven vault drainage |
| 70% LP burn on mint | Makes ALL gaming cycles net-negative |
| `activeSupply`-based pricing | Natural market-driven supply equilibrium |
| Adaptive vault reinvestment ratio | Vault depletion death spiral |
| Rolling vault target (not ATH) | Whale-inflated target manipulation |
| Capped caller bounty on permissionless triggers | MEV bounty gaming |
| Minimum LP balance threshold for FeeManager trigger | Dust griefing on permissionless calls |
| LP auto-registration in FeeManager | Operational bottleneck from manual registration |

## Known Constraints and Mitigations

### FeeManager: rewardTokens array growth
- Every unique token from LP pairs is pushed to `rewardTokens` and never removed
- `_settleRewards` iterates the full array on every DSFO mint/burn
- **Mitigation**: Cap array at ~50 tokens. Add `removeRewardToken()` for zero-balance tokens.

### FeeManager: emergencyWithdraw
- Current code has no guard against draining reward tokens with pending claims
- **Fix**: Add check that withdrawal leaves sufficient balance for pending claims, or restrict to non-reward tokens only.

### FeeManager: LP breakdown slippage
- `removeLiquidity` currently passes 0 for min amounts
- **Fix**: Off-chain trigger script calculates expected amounts with 2% tolerance, passes as parameters. On-chain: revert if output deviates >X% from reserves-based estimate.

### FeeManager: zero DSFO holders
- `triggerBreakdownAndDistribution` reverts when `totalTrackedShares == 0`
- **Fix**: Add treasury fallback — send LP to treasury address when no holders exist.

### FeeManager: LP auto-registration
- `addLPTokenAddress()` is currently `onlyOwner`, creating operational bottleneck
- **Fix**: Add permissionless `registerLP(address)` that validates the address is a V2 pair from the Factory.

### LPVault: harvest does NOT remove/re-add liquidity
- "Retain" simply means keeping LP tokens in the vault. No DEX interaction.
- LP tokens compound automatically via pool fee accrual.
- "DSFO bonus" transfers LP tokens to FeeManager, which handles the breakdown.
- This eliminates sandwich attack vectors on harvest.

### Vault target calculation
- Target = `0.3 * sum(all active NFT mint costs)`, rolling
- Adjusts down on redemption (mint cost removed from sum)
- Adjusts up on new mints (mint cost added to sum)
- Cannot be inflated without real LP commitment (70% burn makes manipulation unprofitable)

## Governance

- **Phase 1**: Owner + TimelockController (48hr delay on all parameter changes)
- **Phase 2**: Snapshot voting (off-chain, MRBL-weighted)
- **Phase 3**: On-chain Governor / Aragon DAO (transfer TimelockController ownership)

### Governance-adjustable parameters (all behind timelock):
- FeeSplitter ratio (default 70/30)
- Burn/lock ratio on DSFO mint (default 70/30)
- Vault harvest allocation percentages (within bounds)
- FeeManager trigger minimum interval and bounty cap
- LPVault harvest minimum interval and bounty cap
- DSFO mint `basePrice` and `priceStep`

## Contract Architecture

```
Deployer → TimelockController → DSFO_mint_v3 (soulbound, linear pricing, 70/30 split)
                               → FeeManager_v2 (claim-based fee distribution)
                               → FeeSplitter (feeTo target, splits LP 70/30)
                               → LPVault (protocol-owned LP, redemption backstop)
```

Four contracts. Clean dependency chain. No circular references.

## Implementation Phases

### Phase 1 (Launch)
- FeeSplitter: receives feeTo LP tokens, forwards 70% to FeeManager, 30% to LPVault
- FeeManager_v2: patched with slippage protection, emergencyWithdraw guard, rewardTokens cap, permissionless trigger, LP auto-registration, treasury fallback
- DSFO_mint_v3: soulbound (ERC-5192), activeSupply linear pricing, 70/30 LP split, LPVault deposit integration
- LPVault: accepts deposits from FeeSplitter and DSFO minting, time-weighted redemption with sliding fee, adaptive harvest, 20% reserve in pro-rata, permissionless harvest trigger
- Factory: call `setFeeTo(feeSplitterAddress)`
- Frontend: updated mint UI with redemption quote, vault health dashboard, fee earnings display

### Phase 2 (1-3 months post-launch)
- MRBL staking for boosted DSFO fee claims
- Snapshot governance integration
- LP farming rewards (funded by portion of vault harvest)
- MRBL listing fees for new token pairs

### Phase 3 (3-6+ months)
- On-chain Governor / Aragon DAO
- Trading competitions
- Referral system
- DSFO marketplace (when secondary market infrastructure exists on PEAQ)
