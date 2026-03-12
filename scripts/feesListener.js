#!/usr/bin/env node
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
  Number.isFinite(chainIdFromEnv) && chainIdFromEnv > 0 ? chainIdFromEnv : 1;

const chain = defineChain({
  id: resolvedChainId,
  name: 'DonnySwapChain',
  network: 'donnyswap-chain',
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

const feeManagerAbi = parseAbi([
  'event FeesDistributed(address indexed token, uint256 totalAmount)',
  'function triggerBreakdownAndDistribution() external',
  'function getHolderCount() view returns (uint256)',
  'function getHolderAt(uint256 index) view returns (address)',
  'function holderBalances(address holder) view returns (uint256)',
  'function totalTrackedShares() view returns (uint256)',
]);

const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

const apiBaseUrl = normalizeBaseUrl(FEE_LISTENER_API_BASE_URL);
const tokenMetadataCache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeBaseUrl(value = '') {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'http://localhost:3002';
  }
  return trimmed.replace(/\/+$/, '');
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
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'symbol',
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    }),
  ]);

  const metadata = {
    symbol: symbol || 'UNKNOWN',
    decimals: Number(decimalsRaw ?? 18),
  };
  tokenMetadataCache.set(tokenAddress, metadata);
  return metadata;
}

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

  return {
    holders,
    totalShares: BigInt(totalSharesRaw),
  };
}

function computePayouts(totalAmount, holders, totalShares) {
  if (totalAmount === 0n || totalShares === 0n) {
    return [];
  }

  const payouts = [];
  let distributed = 0n;

  holders.forEach((holder) => {
    if (holder.balance === 0n) {
      return;
    }
    const share = (totalAmount * holder.balance) / totalShares;
    if (share === 0n) {
      return;
    }
    distributed += share;
    payouts.push({
      address: holder.address,
      rawAmount: share,
      nftCount: Number(holder.balance),
    });
  });

  const remainder = totalAmount - distributed;
  if (remainder > 0n && holders.length > 0) {
    const lastHolder = holders[holders.length - 1];
    const existing = payouts.find((entry) => entry.address === lastHolder.address);
    if (existing) {
      existing.rawAmount += remainder;
    } else {
      payouts.push({
        address: lastHolder.address,
        rawAmount: remainder,
        nftCount: Number(lastHolder.balance),
      });
    }
  }

  return payouts;
}

async function submitFeeRecord({
  userAddress,
  tokenSymbol,
  tokenAddress,
  tokenDecimals,
  feeAmountRaw,
  feeAmountDecimals,
  feeAmountFormatted,
  blockNumber,
  feeManagerTx,
  nftCount,
}) {
  try {
    const response = await axios.post(buildApiUrl('/insertFeesPEAQ'), {
      user_address: userAddress,
      token_symbol: tokenSymbol,
      token_address: tokenAddress,
      token_decimals: tokenDecimals,
      fee_amount: feeAmountFormatted,
      fee_amount_raw: feeAmountRaw,
      fee_amount_decimals: feeAmountDecimals,
      block_height: blockNumber,
      fee_manager_tx: feeManagerTx,
      nft_count: nftCount,
      nft_count_snapshot: nftCount,
    });
    console.log(`Stored fees for ${userAddress}:`, response.data?.fee?.fee_amount || '');
  } catch (error) {
    const details = error.response?.data || error.message;
    console.error(`Failed to store fees for ${userAddress}:`, details);
  }
}

async function updateBlockHeight(blockNumber) {
  try {
    await axios.post(buildApiUrl('/updateBlockHeightPEAQ'), { block_height: Number(blockNumber) });
  } catch (error) {
    const details = error.response?.data || error.message;
    console.error('Failed to update block height:', details);
  }
}

function parseFeesDistributedEvents(logs) {
  try {
    return parseEventLogs({
      abi: feeManagerAbi,
      eventName: 'FeesDistributed',
      logs,
    });
  } catch (error) {
    console.error('Failed to parse FeesDistributed logs:', error.message);
    return [];
  }
}

async function processDistributionEvent(event, holderSnapshot, receipt) {
  const tokenAddress = event.args.token;
  const totalAmount = BigInt(event.args.totalAmount);

  if (totalAmount === 0n) {
    console.log(`FeesDistributed emitted zero amount for token ${tokenAddress}`);
    return;
  }

  const metadata = await getTokenMetadata(tokenAddress);
  const payouts = computePayouts(totalAmount, holderSnapshot.holders, holderSnapshot.totalShares);

  if (!payouts.length) {
    console.log(`No payouts computed for token ${metadata.symbol}`);
    return;
  }

  const formattedTotal = formatUnits(totalAmount, metadata.decimals);
  console.log(
    `Distributing ${formattedTotal} ${metadata.symbol} across ${payouts.length} holders (tx ${receipt.transactionHash})`
  );

  const blockNumber = receipt.blockNumber ? Number(receipt.blockNumber) : null;

  for (const payout of payouts) {
    const formattedAmount = formatUnits(payout.rawAmount, metadata.decimals);
    await submitFeeRecord({
      userAddress: payout.address,
      tokenSymbol: metadata.symbol,
      tokenAddress,
      tokenDecimals: metadata.decimals,
      feeAmountRaw: payout.rawAmount.toString(),
      feeAmountDecimals: metadata.decimals,
      feeAmountFormatted: formattedAmount,
      blockNumber,
      feeManagerTx: receipt.transactionHash,
      nftCount: payout.nftCount,
    });
  }
}

async function runCycle() {
  console.log(`[${new Date().toISOString()}] Starting fee breakdown cycle...`);

  const holderSnapshot = await fetchHolderSnapshot();
  if (holderSnapshot.totalShares === 0n) {
    console.log('No DSFO shares tracked. Skipping trigger.');
    return;
  }

  try {
    const txHash = await walletClient.writeContract({
      address: FEE_MANAGER_ADDRESS,
      abi: feeManagerAbi,
      functionName: 'triggerBreakdownAndDistribution',
    });
    console.log(`Submitted triggerBreakdownAndDistribution tx ${txHash}, awaiting confirmation...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Trigger confirmed in block ${receipt.blockNumber}`);

    const events = parseFeesDistributedEvents(receipt.logs);
    if (!events.length) {
      console.log('No FeesDistributed events emitted.');
    }

    for (const event of events) {
      await processDistributionEvent(event, holderSnapshot, receipt);
    }

    if (receipt.blockNumber) {
      await updateBlockHeight(Number(receipt.blockNumber));
    }
  } catch (error) {
    const details = error.shortMessage || error.message;
    console.error('triggerBreakdownAndDistribution failed:', details);
  }
}

async function main() {
  console.log('Fees listener started with interval (ms):', pollIntervalMs);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cycleStart = Date.now();
    await runCycle();
    const elapsed = Date.now() - cycleStart;
    const waitTime = Math.max(pollIntervalMs - elapsed, 0);
    console.log(`Next cycle in ${Math.round(waitTime / 1000)} seconds.`);
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('SIGINT', () => {
  console.log('Shutting down fees listener (SIGINT).');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down fees listener (SIGTERM).');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fees listener failed to start:', error);
  process.exit(1);
});

