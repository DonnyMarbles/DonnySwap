#!/usr/bin/env node
/**
 * Fees Listener v2 — works with FeeManagerV2 (claim-based distribution).
 *
 * Cycle:
 *   1. Trigger triggerBreakdownAndDistribution() on-chain
 *   2. Parse FeesAccumulated events from the tx receipt
 *   3. Snapshot holder balances at that block
 *   4. Compute per-holder allocations (theoretical share, not transferred)
 *   5. POST batch + allocations to backend API (fee_batches + fee_allocations)
 *   6. Update block height
 */
import 'dotenv/config';
import axios from 'axios';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  http,
  parseAbi,
  parseEventLogs,
} from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

const {
  FEE_LISTENER_RPC_URL = 'https://peaq.betterfuturelabs.xyz',
  FEE_MANAGER_ADDRESS = '0x9cE36CdD9B164a686F4B9AE728f5f68b7b41acaa',
  FEE_MANAGER_OWNER_KEY,
  FEE_LISTENER_API_BASE_URL = 'http://localhost:3002',
  FEES_LISTENER_INTERVAL_MS,
  FEE_LISTENER_CHAIN_ID,
  MNEMONIC,
} = process.env;

if (!MNEMONIC && !FEE_MANAGER_OWNER_KEY) {
  console.error('Provide MNEMONIC or FEE_MANAGER_OWNER_KEY to sign trigger txs.');
  process.exit(1);
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const pollIntervalMs = Number(FEES_LISTENER_INTERVAL_MS || FOUR_HOURS_MS);

const chainIdFromEnv = Number(FEE_LISTENER_CHAIN_ID);
const resolvedChainId =
  Number.isFinite(chainIdFromEnv) && chainIdFromEnv > 0 ? chainIdFromEnv : 3338;

const chain = defineChain({
  id: resolvedChainId,
  name: 'PEAQ',
  network: 'peaq',
  nativeCurrency: { name: 'PEAQ', symbol: 'PEAQ', decimals: 18 },
  rpcUrls: {
    default: { http: [FEE_LISTENER_RPC_URL] },
    public: { http: [FEE_LISTENER_RPC_URL] },
  },
});

const transport = http(FEE_LISTENER_RPC_URL);
const publicClient = createPublicClient({ chain, transport });
const account = MNEMONIC
  ? mnemonicToAccount(MNEMONIC)
  : privateKeyToAccount(FEE_MANAGER_OWNER_KEY);
const walletClient = createWalletClient({ account, chain, transport });

// ── ABIs ──

const feeManagerAbi = parseAbi([
  'event FeesAccumulated(address indexed token, uint256 totalAmount, uint256 accRewardPerShareAfter)',
  'event LPBrokenDown(address indexed lpToken, address indexed token0, address indexed token1, uint256 amountToken0, uint256 amountToken1)',
  'function triggerBreakdownAndDistribution() external',
  'function getHolderCount() view returns (uint256)',
  'function getHolderAt(uint256 index) view returns (address)',
  'function holderBalances(address holder) view returns (uint256)',
  'function totalTrackedShares() view returns (uint256)',
  'function getRewardTokenCount() view returns (uint256)',
  'function getRewardTokenAt(uint256 index) view returns (address)',
]);

const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

// ── Helpers ──

const apiBaseUrl = normalizeBaseUrl(FEE_LISTENER_API_BASE_URL);
const tokenMetadataCache = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeBaseUrl(value = '') {
  const trimmed = value.trim();
  return (trimmed || 'http://localhost:3002').replace(/\/+$/, '');
}

function buildApiUrl(path) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${apiBaseUrl}/${normalized}`;
}

async function getTokenMetadata(tokenAddress) {
  if (tokenMetadataCache.has(tokenAddress)) {
    return tokenMetadataCache.get(tokenAddress);
  }
  const [symbol, decimalsRaw] = await Promise.all([
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'symbol' }),
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
  ]);
  const metadata = { symbol: symbol || 'UNKNOWN', decimals: Number(decimalsRaw ?? 18) };
  tokenMetadataCache.set(tokenAddress, metadata);
  return metadata;
}

// ── Snapshot ──

async function fetchHolderSnapshot() {
  const [holderCountRaw, totalSharesRaw] = await Promise.all([
    publicClient.readContract({
      address: FEE_MANAGER_ADDRESS,
      abi: feeManagerAbi,
      functionName: 'getHolderCount',
    }),
    publicClient.readContract({
      address: FEE_MANAGER_ADDRESS,
      abi: feeManagerAbi,
      functionName: 'totalTrackedShares',
    }),
  ]);

  const holderCount = Number(holderCountRaw);
  const holders = [];

  for (let i = 0; i < holderCount; i += 1) {
    const address = await publicClient.readContract({
      address: FEE_MANAGER_ADDRESS,
      abi: feeManagerAbi,
      functionName: 'getHolderAt',
      args: [BigInt(i)],
    });
    const balance = await publicClient.readContract({
      address: FEE_MANAGER_ADDRESS,
      abi: feeManagerAbi,
      functionName: 'holderBalances',
      args: [address],
    });
    holders.push({ address, balance: BigInt(balance) });
  }

  return { holders, totalShares: BigInt(totalSharesRaw) };
}

// ── Allocation computation (mirrors contract math) ──

function computeAllocations(totalAmount, holders, totalShares) {
  if (totalAmount === 0n || totalShares === 0n) return [];

  const allocations = [];
  let distributed = 0n;

  for (const holder of holders) {
    if (holder.balance === 0n) continue;
    const share = (totalAmount * holder.balance) / totalShares;
    if (share === 0n) continue;
    distributed += share;
    allocations.push({
      address: holder.address,
      rawAmount: share,
      nftCount: Number(holder.balance),
    });
  }

  // Remainder dust to last allocation
  const remainder = totalAmount - distributed;
  if (remainder > 0n && allocations.length > 0) {
    allocations[allocations.length - 1].rawAmount += remainder;
  }

  return allocations;
}

// ── API calls ──

async function submitFeeBatch({
  feeManagerTx,
  lpToken,
  tokenPaid,
  tokenPaidSymbol,
  tokenPaidDecimals,
  amountPaidRaw,
  blockHeight,
  allocations,
}) {
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
    console.log(
      `  Batch recorded: ${formatUnits(amountPaidRaw, tokenPaidDecimals)} ${tokenPaidSymbol} → ${allocations.length} holders (batch #${response.data?.batch?.id || '?'})`
    );
  } catch (error) {
    const details = error.response?.data || error.message;
    console.error(`  Failed to record batch for ${tokenPaidSymbol}:`, details);
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
  console.log(`\n[${new Date().toISOString()}] Starting fee breakdown cycle...`);

  const holderSnapshot = await fetchHolderSnapshot();
  console.log(`  Holders: ${holderSnapshot.holders.length}, Total shares: ${holderSnapshot.totalShares}`);

  if (holderSnapshot.totalShares === 0n) {
    console.log('  No DSFO shares tracked. Skipping trigger.');
    return;
  }

  let receipt;
  try {
    const txHash = await walletClient.writeContract({
      address: FEE_MANAGER_ADDRESS,
      abi: feeManagerAbi,
      functionName: 'triggerBreakdownAndDistribution',
    });
    console.log(`  Submitted tx ${txHash}, awaiting confirmation...`);
    receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`  Confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error('  triggerBreakdownAndDistribution failed:', error.shortMessage || error.message);
    return;
  }

  // Parse FeesAccumulated events
  let events;
  try {
    events = parseEventLogs({
      abi: feeManagerAbi,
      eventName: 'FeesAccumulated',
      logs: receipt.logs,
    });
  } catch (error) {
    console.error('  Failed to parse FeesAccumulated logs:', error.message);
    events = [];
  }

  if (!events.length) {
    console.log('  No FeesAccumulated events emitted (nothing to distribute).');
  }

  // Parse LPBrokenDown to get the LP token for each breakdown
  let lpEvents = [];
  try {
    lpEvents = parseEventLogs({
      abi: feeManagerAbi,
      eventName: 'LPBrokenDown',
      logs: receipt.logs,
    });
  } catch {
    // Not critical — we can proceed without LP token info
  }

  // Map token address → LP token address from LPBrokenDown events
  const tokenToLP = new Map();
  for (const lpEvent of lpEvents) {
    const { lpToken, token0, token1 } = lpEvent.args;
    tokenToLP.set(token0, lpToken);
    tokenToLP.set(token1, lpToken);
  }

  const blockHeight = receipt.blockNumber ? Number(receipt.blockNumber) : null;

  for (const event of events) {
    const tokenAddress = event.args.token;
    const totalAmount = BigInt(event.args.totalAmount);
    if (totalAmount === 0n) continue;

    const metadata = await getTokenMetadata(tokenAddress);
    const allocations = computeAllocations(totalAmount, holderSnapshot.holders, holderSnapshot.totalShares);

    if (allocations.length === 0) {
      console.log(`  No allocations for ${metadata.symbol}`);
      continue;
    }

    const formattedTotal = formatUnits(totalAmount, metadata.decimals);
    console.log(`  Distributing ${formattedTotal} ${metadata.symbol} across ${allocations.length} holders`);

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

  if (blockHeight) {
    await updateBlockHeight(blockHeight);
  }
}

// ── Entry point ──

async function main() {
  console.log('Fees listener v2 started with interval (ms):', pollIntervalMs);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cycleStart = Date.now();
    try {
      await runCycle();
    } catch (error) {
      console.error('Cycle error:', error.message);
    }
    const elapsed = Date.now() - cycleStart;
    const waitTime = Math.max(pollIntervalMs - elapsed, 0);
    console.log(`Next cycle in ${Math.round(waitTime / 1000)} seconds.`);
    if (waitTime > 0) await sleep(waitTime);
  }
}

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('SIGINT', () => { console.log('Shutting down (SIGINT).'); process.exit(0); });
process.on('SIGTERM', () => { console.log('Shutting down (SIGTERM).'); process.exit(0); });

main().catch((error) => {
  console.error('Fees listener failed to start:', error);
  process.exit(1);
});
