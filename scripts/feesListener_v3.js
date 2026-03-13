#!/usr/bin/env node
/**
 * Fees Listener v3 — Slippage-protected triggers, FeeSplitter integration, RPC fallback.
 *
 * Improvements over v2:
 *   - Calls FeeSplitter.distributeBatch() before triggering FeeManager (fees were sitting idle)
 *   - Uses slippage-protected triggerBreakdownAndDistribution(minAmounts0[], minAmounts1[])
 *   - Reads on-chain reserves to compute 2% slippage tolerance per LP
 *   - RPC fallback across 3 QuickNode endpoints
 *   - Multicall-style batched holder snapshot
 *
 * Env vars:
 *   FEE_MANAGER_ADDRESS        — FeeManagerV2 contract address
 *   FEE_SPLITTER_ADDRESS       — FeeSplitter contract address
 *   FEE_MANAGER_OWNER_KEY      — Private key for signing trigger txs
 *   MNEMONIC                   — Alternative to private key
 *   FEE_LISTENER_API_BASE_URL  — Backend API base URL (default: http://localhost:3002)
 *   FEES_LISTENER_INTERVAL_MS  — Poll interval (default: 4 hours)
 */
import 'dotenv/config';
import axios from 'axios';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  http,
  fallback,
  parseAbi,
  parseEventLogs,
} from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

const {
  FEE_MANAGER_ADDRESS,
  FEE_SPLITTER_ADDRESS,
  FEE_MANAGER_OWNER_KEY,
  FEE_LISTENER_API_BASE_URL = 'http://localhost:3002',
  FEES_LISTENER_INTERVAL_MS,
  MNEMONIC,
} = process.env;

if (!FEE_MANAGER_ADDRESS || !FEE_SPLITTER_ADDRESS) {
  console.error('FEE_MANAGER_ADDRESS and FEE_SPLITTER_ADDRESS are required.');
  process.exit(1);
}
if (!MNEMONIC && !FEE_MANAGER_OWNER_KEY) {
  console.error('Provide MNEMONIC or FEE_MANAGER_OWNER_KEY to sign trigger txs.');
  process.exit(1);
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const pollIntervalMs = Number(FEES_LISTENER_INTERVAL_MS || FOUR_HOURS_MS);
const SLIPPAGE_BPS = 200; // 2% slippage tolerance

// ── Chain + RPC with fallback ──

const RPC_URLS = [
  'https://quicknode1.peaq.xyz',
  'https://quicknode2.peaq.xyz',
  'https://quicknode3.peaq.xyz',
];

const chain = defineChain({
  id: 3338,
  name: 'PEAQ',
  network: 'peaq',
  nativeCurrency: { name: 'PEAQ', symbol: 'PEAQ', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URLS[0]] },
    public: { http: RPC_URLS },
  },
});

const transport = fallback(RPC_URLS.map((url) => http(url)), { rank: true });
const publicClient = createPublicClient({ chain, transport });
const account = MNEMONIC
  ? mnemonicToAccount(MNEMONIC)
  : privateKeyToAccount(FEE_MANAGER_OWNER_KEY);
const walletClient = createWalletClient({ account, chain, transport });

// ── ABIs ──

const feeManagerAbi = parseAbi([
  'event FeesAccumulated(address indexed token, uint256 totalAmount, uint256 accRewardPerShareAfter)',
  'event LPBrokenDown(address indexed lpToken, address indexed token0, address indexed token1, uint256 amountToken0, uint256 amountToken1)',
  'function triggerBreakdownAndDistribution(uint256[] calldata minAmounts0, uint256[] calldata minAmounts1) external',
  'function triggerBreakdownAndDistribution() external',
  'function getHolderCount() view returns (uint256)',
  'function getHolderAt(uint256 index) view returns (address)',
  'function holderBalances(address holder) view returns (uint256)',
  'function totalTrackedShares() view returns (uint256)',
  'function getLPTokenCount() view returns (uint256)',
  'function lpTokenAddresses(uint256 index) view returns (address)',
  'function triggerMinLPBalance() view returns (uint256)',
]);

const feeSplitterAbi = parseAbi([
  'function distributeBatch(address[] calldata tokens) external',
]);

const pairAbi = parseAbi([
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function balanceOf(address) view returns (uint256)',
]);

const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
]);

// ── Helpers ──

const apiBaseUrl = (FEE_LISTENER_API_BASE_URL || 'http://localhost:3002').replace(/\/+$/, '');
const tokenMetadataCache = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildApiUrl(path) {
  return `${apiBaseUrl}/${path.replace(/^\//, '')}`;
}

async function getTokenMetadata(tokenAddress) {
  if (tokenMetadataCache.has(tokenAddress)) return tokenMetadataCache.get(tokenAddress);
  const [symbol, decimalsRaw] = await Promise.all([
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'symbol' }),
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
  ]);
  const metadata = { symbol: symbol || 'UNKNOWN', decimals: Number(decimalsRaw ?? 18) };
  tokenMetadataCache.set(tokenAddress, metadata);
  return metadata;
}

// ── Slippage calculation ──

async function computeMinAmounts() {
  const lpCount = Number(await publicClient.readContract({
    address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'getLPTokenCount',
  }));

  const minAmounts0 = [];
  const minAmounts1 = [];

  for (let i = 0; i < lpCount; i++) {
    const lpAddr = await publicClient.readContract({
      address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'lpTokenAddresses', args: [BigInt(i)],
    });

    // Get LP balance held by FeeManager
    const lpBalance = await publicClient.readContract({
      address: lpAddr, abi: pairAbi, functionName: 'balanceOf', args: [FEE_MANAGER_ADDRESS],
    });

    if (lpBalance === 0n) {
      minAmounts0.push(0n);
      minAmounts1.push(0n);
      continue;
    }

    // Read reserves and total supply to compute expected amounts
    const [reserves, totalSupply] = await Promise.all([
      publicClient.readContract({ address: lpAddr, abi: pairAbi, functionName: 'getReserves' }),
      publicClient.readContract({ address: lpAddr, abi: pairAbi, functionName: 'totalSupply' }),
    ]);

    const [reserve0, reserve1] = reserves;

    // Expected amounts from removing lpBalance LP
    const expected0 = (lpBalance * reserve0) / totalSupply;
    const expected1 = (lpBalance * reserve1) / totalSupply;

    // Apply slippage tolerance
    const min0 = expected0 - (expected0 * BigInt(SLIPPAGE_BPS)) / 10000n;
    const min1 = expected1 - (expected1 * BigInt(SLIPPAGE_BPS)) / 10000n;

    minAmounts0.push(min0);
    minAmounts1.push(min1);
  }

  return { minAmounts0, minAmounts1 };
}

// ── FeeSplitter: distribute accumulated protocol fees ──

async function distributeFeeSplitter() {
  // Get all LP tokens registered in FeeManager — these are the tokens FeeSplitter might hold
  const lpCount = Number(await publicClient.readContract({
    address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'getLPTokenCount',
  }));

  const tokensWithBalance = [];
  for (let i = 0; i < lpCount; i++) {
    const lpAddr = await publicClient.readContract({
      address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'lpTokenAddresses', args: [BigInt(i)],
    });
    const bal = await publicClient.readContract({
      address: lpAddr, abi: erc20Abi, functionName: 'balanceOf', args: [FEE_SPLITTER_ADDRESS],
    });
    if (bal > 0n) tokensWithBalance.push(lpAddr);
  }

  if (tokensWithBalance.length === 0) {
    console.log('  FeeSplitter: no LP tokens to distribute.');
    return;
  }

  console.log(`  FeeSplitter: distributing ${tokensWithBalance.length} LP token(s)...`);
  try {
    const txHash = await walletClient.writeContract({
      address: FEE_SPLITTER_ADDRESS,
      abi: feeSplitterAbi,
      functionName: 'distributeBatch',
      args: [tokensWithBalance],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`  FeeSplitter: distributed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error('  FeeSplitter.distributeBatch failed:', error.shortMessage || error.message);
  }
}

// ── Holder snapshot (batched reads) ──

async function fetchHolderSnapshot() {
  const [holderCountRaw, totalSharesRaw] = await Promise.all([
    publicClient.readContract({
      address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'getHolderCount',
    }),
    publicClient.readContract({
      address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'totalTrackedShares',
    }),
  ]);

  const holderCount = Number(holderCountRaw);
  const holders = [];

  // Batch in groups of 50 for parallel reads
  const BATCH_SIZE = 50;
  for (let start = 0; start < holderCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, holderCount);
    const batch = [];
    for (let i = start; i < end; i++) {
      batch.push(
        publicClient.readContract({
          address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'getHolderAt', args: [BigInt(i)],
        }).then(async (address) => {
          const balance = await publicClient.readContract({
            address: FEE_MANAGER_ADDRESS, abi: feeManagerAbi, functionName: 'holderBalances', args: [address],
          });
          return { address, balance: BigInt(balance) };
        })
      );
    }
    const results = await Promise.all(batch);
    holders.push(...results);
  }

  return { holders, totalShares: BigInt(totalSharesRaw) };
}

// ── Allocation computation ──

function computeAllocations(totalAmount, holders, totalShares) {
  if (totalAmount === 0n || totalShares === 0n) return [];
  const allocations = [];
  let distributed = 0n;

  for (const holder of holders) {
    if (holder.balance === 0n) continue;
    const share = (totalAmount * holder.balance) / totalShares;
    if (share === 0n) continue;
    distributed += share;
    allocations.push({ address: holder.address, rawAmount: share, nftCount: Number(holder.balance) });
  }

  const remainder = totalAmount - distributed;
  if (remainder > 0n && allocations.length > 0) {
    allocations[allocations.length - 1].rawAmount += remainder;
  }
  return allocations;
}

// ── API calls ──

async function submitFeeBatch({ feeManagerTx, lpToken, tokenPaid, tokenPaidSymbol, tokenPaidDecimals, amountPaidRaw, blockHeight, allocations }) {
  try {
    const response = await axios.post(buildApiUrl('/fee-batch'), {
      fee_manager_tx: feeManagerTx,
      lp_token: lpToken || '0x0000000000000000000000000000000000000000',
      token_paid: tokenPaid,
      token_paid_symbol: tokenPaidSymbol,
      token_paid_decimals: tokenPaidDecimals,
      amount_paid_raw: amountPaidRaw.toString(),
      block_height: blockHeight,
      allocations: allocations.map((a) => ({
        holder_address: a.address,
        amount_raw: a.rawAmount.toString(),
        nft_count: a.nftCount,
      })),
    });
    console.log(`  Batch recorded: ${formatUnits(amountPaidRaw, tokenPaidDecimals)} ${tokenPaidSymbol} → ${allocations.length} holders (batch #${response.data?.batch?.id || '?'})`);
  } catch (error) {
    console.error(`  Failed to record batch for ${tokenPaidSymbol}:`, error.response?.data || error.message);
  }
}

async function updateBlockHeight(blockNumber) {
  try {
    await axios.post(buildApiUrl('/updateBlockHeightPEAQ'), { block_height: Number(blockNumber) });
  } catch (error) {
    console.error('Failed to update block height:', error.response?.data || error.message);
  }
}

// ── Main cycle ──

async function runCycle() {
  console.log(`\n[${new Date().toISOString()}] Starting fee cycle...`);

  // Step 1: Distribute FeeSplitter (move LP from FeeSplitter → FeeManager/LPVault)
  await distributeFeeSplitter();

  // Step 2: Snapshot holders
  const holderSnapshot = await fetchHolderSnapshot();
  console.log(`  Holders: ${holderSnapshot.holders.length}, Total shares: ${holderSnapshot.totalShares}`);

  if (holderSnapshot.totalShares === 0n) {
    console.log('  No DSFO shares tracked. Skipping trigger.');
    return;
  }

  // Step 3: Compute slippage-protected min amounts
  let minAmounts0, minAmounts1;
  try {
    ({ minAmounts0, minAmounts1 } = await computeMinAmounts());
    console.log(`  Computed slippage bounds for ${minAmounts0.length} LP token(s) (${SLIPPAGE_BPS / 100}% tolerance)`);
  } catch (error) {
    console.warn('  Failed to compute slippage bounds, falling back to unprotected:', error.message);
    minAmounts0 = null;
    minAmounts1 = null;
  }

  // Step 4: Trigger breakdown with slippage protection
  let receipt;
  try {
    let txHash;
    if (minAmounts0 && minAmounts1) {
      txHash = await walletClient.writeContract({
        address: FEE_MANAGER_ADDRESS,
        abi: feeManagerAbi,
        functionName: 'triggerBreakdownAndDistribution',
        args: [minAmounts0, minAmounts1],
      });
    } else {
      txHash = await walletClient.writeContract({
        address: FEE_MANAGER_ADDRESS,
        abi: feeManagerAbi,
        functionName: 'triggerBreakdownAndDistribution',
      });
    }
    console.log(`  Submitted tx ${txHash}, awaiting confirmation...`);
    receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`  Confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error('  triggerBreakdownAndDistribution failed:', error.shortMessage || error.message);
    return;
  }

  // Step 5: Parse events and record batches
  let events = [];
  try {
    events = parseEventLogs({ abi: feeManagerAbi, eventName: 'FeesAccumulated', logs: receipt.logs });
  } catch (error) {
    console.error('  Failed to parse FeesAccumulated logs:', error.message);
  }

  if (!events.length) {
    console.log('  No FeesAccumulated events (nothing to distribute).');
  }

  let lpEvents = [];
  try {
    lpEvents = parseEventLogs({ abi: feeManagerAbi, eventName: 'LPBrokenDown', logs: receipt.logs });
  } catch { /* non-critical */ }

  const tokenToLP = new Map();
  for (const lpEvent of lpEvents) {
    tokenToLP.set(lpEvent.args.token0, lpEvent.args.lpToken);
    tokenToLP.set(lpEvent.args.token1, lpEvent.args.lpToken);
  }

  const blockHeight = receipt.blockNumber ? Number(receipt.blockNumber) : null;

  for (const event of events) {
    const tokenAddress = event.args.token;
    const totalAmount = BigInt(event.args.totalAmount);
    if (totalAmount === 0n) continue;

    const metadata = await getTokenMetadata(tokenAddress);
    const allocations = computeAllocations(totalAmount, holderSnapshot.holders, holderSnapshot.totalShares);

    if (allocations.length === 0) continue;
    console.log(`  Distributing ${formatUnits(totalAmount, metadata.decimals)} ${metadata.symbol} across ${allocations.length} holders`);

    await submitFeeBatch({
      feeManagerTx: receipt.transactionHash,
      lpToken: tokenToLP.get(tokenAddress) || null,
      tokenPaid: tokenAddress,
      tokenPaidSymbol: metadata.symbol,
      tokenPaidDecimals: metadata.decimals,
      amountPaidRaw: totalAmount,
      blockHeight,
      allocations,
    });
  }

  if (blockHeight) await updateBlockHeight(blockHeight);
}

// ── Entry point ──

async function main() {
  console.log('Fees listener v3 started');
  console.log(`  Interval: ${pollIntervalMs / 1000}s`);
  console.log(`  FeeManager: ${FEE_MANAGER_ADDRESS}`);
  console.log(`  FeeSplitter: ${FEE_SPLITTER_ADDRESS}`);
  console.log(`  RPCs: ${RPC_URLS.join(', ')}`);
  console.log(`  Slippage tolerance: ${SLIPPAGE_BPS / 100}%`);

  while (true) {
    const cycleStart = Date.now();
    try {
      await runCycle();
    } catch (error) {
      console.error('Cycle error:', error.message);
    }
    const elapsed = Date.now() - cycleStart;
    const waitTime = Math.max(pollIntervalMs - elapsed, 0);
    console.log(`Next cycle in ${Math.round(waitTime / 1000)}s.`);
    if (waitTime > 0) await sleep(waitTime);
  }
}

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('SIGINT', () => { console.log('Shutting down.'); process.exit(0); });
process.on('SIGTERM', () => { console.log('Shutting down.'); process.exit(0); });

main().catch((error) => {
  console.error('Fees listener failed to start:', error);
  process.exit(1);
});
