import { readFileSync } from 'fs';

import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseUnits,
  zeroAddress,
} from 'viem';
import { PEAQ_CHAIN } from '../config/chain.js';
import { FACTORY_ADDRESS, WRAPPED_PEAQ_ADDRESS } from '../config/contracts.js';
import { buildPeaqMetrics } from './peaqMetricsService.js';
import { getPeaqPrice, resolveTokenPrices } from './marketDataService.js';
import { normalizeDecimals } from '../utils/data.js';
import { normalizeCoingeckoId } from '../utils/tokens.js';

const loadJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf-8'));

const ERC20ABI = loadJson('../abi/ERC20.json');
const UniswapV2FactoryABI = loadJson('../abi/UniswapV2Factory.json');
const UniswapV2PairABI = loadJson('../abi/UniswapV2Pair.json');

const rpcUrl = PEAQ_CHAIN.rpcUrls?.default?.http?.[0];

if (!rpcUrl) {
  throw new Error('PEAQ RPC URL is not configured');
}

const publicClient = createPublicClient({
  chain: PEAQ_CHAIN,
  transport: http(rpcUrl),
});

const ZERO_ADDRESS = zeroAddress;
const USD_UNITS_FACTOR = 10n ** 18n;
const MAX_SUPPLY_OVERRIDES = {
  MRBL: parseUnits('150000', 18),
};
const DEFAULT_PAIR_SUMMARY_TTL_MS = 60_000;
const PAIR_SUMMARY_TTL_MS =
  Number(process.env.PAIR_SUMMARY_TTL_MS) > 0
    ? Number(process.env.PAIR_SUMMARY_TTL_MS)
    : DEFAULT_PAIR_SUMMARY_TTL_MS;

let cachedPairsDump = null;
let cachedPairsTimestamp = 0;
let pairsFetchPromise = null;

const toUsdUnits = (price) => {
  if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) {
    return null;
  }
  const normalized = price.toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: 18,
  });
  try {
    const parsed = parseUnits(normalized, 18);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeTokenDefinitions = (tokensPayload = []) => {
  const tokensByAddress = new Map();
  let peaqToken = null;

  tokensPayload.forEach((token) => {
    if (!token) return;
    const symbol =
      typeof token.symbol === 'string' && token.symbol.trim().length > 0
        ? token.symbol.trim().toUpperCase()
        : '';
    if (!symbol) return;

    const decimals = normalizeDecimals(token.decimals);
    const coingeckoId = normalizeCoingeckoId(token.coingeckoId || token?.extensions?.coingeckoId);

    if (symbol === 'PEAQ' && (!token.address || token.address === 'PEAQ')) {
      peaqToken = {
        symbol,
        decimals,
        coingeckoId,
      };
      return;
    }

    if (!token.address || !isAddress(token.address)) {
      return;
    }

    const normalizedAddress = getAddress(token.address);
    if (tokensByAddress.has(normalizedAddress)) {
      return;
    }

    tokensByAddress.set(normalizedAddress, {
      symbol,
      decimals,
      coingeckoId,
    });
  });

  return { tokensByAddress, peaqToken };
};

const buildTokenPricePayload = (tokensByAddress, peaqToken) => {
  const seenIds = new Set();
  const payload = [];

  const pushIfValid = (tokenMeta) => {
    if (!tokenMeta?.coingeckoId || seenIds.has(tokenMeta.coingeckoId)) return;
    seenIds.add(tokenMeta.coingeckoId);
    payload.push({
      symbol: tokenMeta.symbol,
      coingeckoId: tokenMeta.coingeckoId,
    });
  };

  tokensByAddress.forEach((tokenMeta) => pushIfValid(tokenMeta));
  if (peaqToken) {
    pushIfValid(peaqToken);
  }

  return payload;
};

const formatBigDecimal = (value, decimals, fractionDigits = 2) => {
  if (value === 0n) {
    return (0).toFixed(fractionDigits);
  }
  const numeric = Number(formatUnits(value, decimals));
  if (!Number.isFinite(numeric)) {
    return (0).toFixed(fractionDigits);
  }
  return numeric.toFixed(fractionDigits);
};

const formatBurnedPercentage = (portion, total) => {
  if (total === 0n) return '0.00';
  const scaled = (portion * 10000n * 10n ** 18n) / total;
  const numeric = Number(formatUnits(scaled, 20));
  if (!Number.isFinite(numeric)) return '0.00';
  return numeric.toFixed(2);
};

const formatUserShare = (shareBigInt, hasHoldings) => {
  if (shareBigInt === 0n) {
    return hasHoldings ? '<0.01' : '0.00';
  }
  const numeric = Number(formatUnits(shareBigInt, 2));
  if (!Number.isFinite(numeric)) return '0.00';
  return numeric.toFixed(2);
};

const computePriceInWpeaq = (tokenAddress, pairs) => {
  for (const pair of pairs) {
    const { token0Address, token1Address, reserves, token0Decimals, token1Decimals } = pair;
    if (!reserves || reserves.length < 2) continue;

    if (token0Address === tokenAddress && token1Address === WRAPPED_PEAQ_ADDRESS) {
      const reserveToken = reserves[0];
      const reserveWpeaq = reserves[1];
      const tokenAmount = Number(formatUnits(reserveToken, token0Decimals));
      const wpeaqAmount = Number(formatUnits(reserveWpeaq, 18));
      if (tokenAmount > 0 && Number.isFinite(wpeaqAmount)) {
        return wpeaqAmount / tokenAmount;
      }
    } else if (token1Address === tokenAddress && token0Address === WRAPPED_PEAQ_ADDRESS) {
      const reserveToken = reserves[1];
      const reserveWpeaq = reserves[0];
      const tokenAmount = Number(formatUnits(reserveToken, token1Decimals));
      const wpeaqAmount = Number(formatUnits(reserveWpeaq, 18));
      if (tokenAmount > 0 && Number.isFinite(wpeaqAmount)) {
        return wpeaqAmount / tokenAmount;
      }
    }
  }
  return 0;
};

const resolveUsdPrice = ({ tokenMeta, tokenAddress, pairs, tokenPrices, peaqPrice }) => {
  const oraclePrice =
    tokenMeta.coingeckoId != null ? tokenPrices?.[tokenMeta.coingeckoId] : undefined;
  if (typeof oraclePrice === 'number' && Number.isFinite(oraclePrice) && oraclePrice > 0) {
    return oraclePrice;
  }

  if (typeof peaqPrice === 'number' && Number.isFinite(peaqPrice) && peaqPrice > 0) {
    const priceInWpeaq = computePriceInWpeaq(tokenAddress, pairs);
    if (priceInWpeaq > 0) {
      return priceInWpeaq * peaqPrice;
    }
  }

  return null;
};

const fetchAllPairsDump = async () => {
  const factoryContract = {
    address: FACTORY_ADDRESS,
    abi: UniswapV2FactoryABI,
  };

  const pairCountBn = await publicClient.readContract({
    ...factoryContract,
    functionName: 'allPairsLength',
  });

  const pairCount = Number(pairCountBn);
  const pairs = [];

  for (let index = 0; index < pairCount; index += 1) {
    try {
      const pairAddressRaw = await publicClient.readContract({
        ...factoryContract,
        functionName: 'allPairs',
        args: [BigInt(index)],
      });

      const pairAddress = getAddress(pairAddressRaw);
      const pairContract = { address: pairAddress, abi: UniswapV2PairABI };

      const [token0AddrRaw, token1AddrRaw, reservesResult, totalSupply, burnedBalance] =
        await Promise.all([
          publicClient.readContract({ ...pairContract, functionName: 'token0' }),
          publicClient.readContract({ ...pairContract, functionName: 'token1' }),
          publicClient.readContract({ ...pairContract, functionName: 'getReserves' }),
          publicClient.readContract({ ...pairContract, functionName: 'totalSupply' }),
          publicClient.readContract({
            ...pairContract,
            functionName: 'balanceOf',
            args: [ZERO_ADDRESS],
          }),
        ]);

      const reservesArray = Array.isArray(reservesResult)
        ? reservesResult
        : [reservesResult.reserve0, reservesResult.reserve1];

      pairs.push({
        pairAddress,
        token0Address: getAddress(token0AddrRaw),
        token1Address: getAddress(token1AddrRaw),
        reserves: reservesArray,
        totalSupply,
        burnedBalance,
      });
    } catch (error) {
      console.error(`Failed to read pair at index ${index}:`, error);
    }
  }

  return pairs;
};

const getCachedPairsDump = async () => {
  const now = Date.now();
  const isFresh = cachedPairsDump && now - cachedPairsTimestamp < PAIR_SUMMARY_TTL_MS;
  if (isFresh) {
    return cachedPairsDump;
  }
  if (pairsFetchPromise) {
    return pairsFetchPromise;
  }
  pairsFetchPromise = fetchAllPairsDump()
    .then((pairs) => {
      cachedPairsDump = pairs;
      cachedPairsTimestamp = Date.now();
      return pairs;
    })
    .catch((error) => {
      console.error('Failed to refresh pair cache', error);
      throw error;
    })
    .finally(() => {
      pairsFetchPromise = null;
    });
  return pairsFetchPromise;
};

const summarizePairsForTokens = async (tokensByAddress) => {
  const rawPairs = await getCachedPairsDump();
  const pairs = [];
  const burnedTotals = new Map();

  rawPairs.forEach((pair) => {
    const token0Meta = tokensByAddress.get(pair.token0Address);
    const token1Meta = tokensByAddress.get(pair.token1Address);
    if (!token0Meta && !token1Meta) {
      return;
    }

    const token0Decimals =
      token0Meta?.decimals ?? (pair.token0Address === WRAPPED_PEAQ_ADDRESS ? 18 : 18);
    const token1Decimals =
      token1Meta?.decimals ?? (pair.token1Address === WRAPPED_PEAQ_ADDRESS ? 18 : 18);

    pairs.push({
      pairAddress: pair.pairAddress,
      token0Address: pair.token0Address,
      token1Address: pair.token1Address,
      reserves: pair.reserves,
      token0Decimals,
      token1Decimals,
    });

    if (token0Meta) {
      const reserveToken = pair.reserves?.[0] ?? 0n;
      const amount =
        pair.totalSupply === 0n ? 0n : (pair.burnedBalance * reserveToken) / pair.totalSupply;
      burnedTotals.set(
        token0Meta.symbol,
        (burnedTotals.get(token0Meta.symbol) || 0n) + amount,
      );
    }
    if (token1Meta) {
      const reserveToken = pair.reserves?.[1] ?? 0n;
      const amount =
        pair.totalSupply === 0n ? 0n : (pair.burnedBalance * reserveToken) / pair.totalSupply;
      burnedTotals.set(
        token1Meta.symbol,
        (burnedTotals.get(token1Meta.symbol) || 0n) + amount,
      );
    }
  });

  return { pairs, burnedTotals };
};

const buildErc20Row = async ({
  tokenAddress,
  tokenMeta,
  userAddress,
  pairs,
  burnedTotals,
  tokenPrices,
  peaqPrice,
}) => {
  try {
    const tokenContract = { address: tokenAddress, abi: ERC20ABI };
    const [totalSupply, burnedBalance, userBalance] = await Promise.all([
      publicClient.readContract({ ...tokenContract, functionName: 'totalSupply' }),
      publicClient.readContract({
        ...tokenContract,
        functionName: 'balanceOf',
        args: [ZERO_ADDRESS],
      }),
      publicClient.readContract({
        ...tokenContract,
        functionName: 'balanceOf',
        args: [userAddress],
      }),
    ]);

    const burnedFromLps = burnedTotals.get(tokenMeta.symbol) || 0n;
    const totalBurned = burnedBalance + burnedFromLps;
    const supplyOverride = MAX_SUPPLY_OVERRIDES[tokenMeta.symbol];

    let circulatingSupply;
    if (supplyOverride !== undefined) {
      circulatingSupply = supplyOverride > totalBurned ? supplyOverride - totalBurned : 0n;
    } else {
      const difference = totalSupply - totalBurned;
      circulatingSupply = difference > 0n ? difference : 0n;
    }

    const shareBigInt = totalSupply === 0n ? 0n : (userBalance * 10000n) / totalSupply;
    const usdPrice = resolveUsdPrice({
      tokenMeta,
      tokenAddress,
      pairs,
      tokenPrices,
      peaqPrice,
    });
    const usdUnits = usdPrice ? toUsdUnits(usdPrice) : null;

    const marketCap =
      usdUnits != null ? (circulatingSupply * usdUnits) / USD_UNITS_FACTOR : 0n;
    const userBalanceUsd =
      usdUnits != null ? (userBalance * usdUnits) / USD_UNITS_FACTOR : 0n;

    return {
      symbol: tokenMeta.symbol,
      tokenAddress,
      decimals: tokenMeta.decimals,
      totalSupply: formatBigDecimal(totalSupply, tokenMeta.decimals),
      circulatingSupply: formatBigDecimal(circulatingSupply, tokenMeta.decimals),
      userBalance: formatBigDecimal(userBalance, tokenMeta.decimals),
      burnedPercentage: formatBurnedPercentage(totalBurned, totalSupply),
      totalBurnedTokens: formatBigDecimal(totalBurned, tokenMeta.decimals),
      userShare: formatUserShare(shareBigInt, userBalance > 0n),
      marketCap: formatBigDecimal(marketCap, tokenMeta.decimals),
      userBalanceUSD: formatBigDecimal(userBalanceUsd, tokenMeta.decimals),
      usdPrice: typeof usdPrice === 'number' && Number.isFinite(usdPrice) ? usdPrice : null,
    };
  } catch (error) {
    console.error(`Failed to build token row for ${tokenMeta.symbol} (${tokenAddress})`, error);
    return null;
  }
};

const mapPeaqMetricsToRow = (metrics, decimals = 18) => ({
  symbol: 'PEAQ',
  tokenAddress: null,
  decimals,
  totalSupply: metrics.totalSupply,
  circulatingSupply: metrics.circulatingSupply,
  userBalance: metrics.userBalance,
  burnedPercentage: metrics.burnedPercentage,
  totalBurnedTokens: metrics.totalBurnedTokens,
  userShare: metrics.userShare,
  marketCap: metrics.marketCap,
  userBalanceUSD: metrics.userBalanceUSD,
  usdPrice:
    typeof metrics.peaqPrice === 'number' && Number.isFinite(metrics.peaqPrice)
      ? metrics.peaqPrice
      : null,
});

const fetchTokenPriceMap = async (tokensByAddress, peaqToken) => {
  const payload = buildTokenPricePayload(tokensByAddress, peaqToken);
  if (!payload.length) {
    return {};
  }
  try {
    return await resolveTokenPrices(payload);
  } catch (error) {
    console.error('Token price resolution failed', error);
    return {};
  }
};

const computeTokenBalances = async ({ userAddress, tokens: tokensPayload }) => {
  if (!userAddress) {
    throw new Error('userAddress is required');
  }

  let normalizedAddress;
  try {
    normalizedAddress = getAddress(userAddress);
  } catch {
    throw new Error('Invalid userAddress');
  }

  if (!Array.isArray(tokensPayload) || tokensPayload.length === 0) {
    throw new Error('tokens payload is required');
  }

  const { tokensByAddress, peaqToken } = normalizeTokenDefinitions(tokensPayload);

  if (!tokensByAddress.size && !peaqToken) {
    throw new Error('No valid tokens provided');
  }

  const [{ pairs, burnedTotals }, peaqPrice, tokenPrices] = await Promise.all([
    summarizePairsForTokens(tokensByAddress),
    getPeaqPrice(),
    fetchTokenPriceMap(tokensByAddress, peaqToken),
  ]);

  const rows = [];

  if (peaqToken) {
    try {
      const metrics = await buildPeaqMetrics({
        userAddress: normalizedAddress,
        burnedTokens: burnedTotals.get('WPEAQ') || 0n,
        peaqPriceOverride: peaqPrice,
      });
      if (metrics) {
        rows.push(mapPeaqMetricsToRow(metrics, peaqToken.decimals));
      }
    } catch (error) {
      console.error('Failed to compute PEAQ metrics', error);
    }
  }

  for (const [tokenAddress, tokenMeta] of tokensByAddress.entries()) {
    const row = await buildErc20Row({
      tokenAddress,
      tokenMeta,
      userAddress: normalizedAddress,
      pairs,
      burnedTotals,
      tokenPrices,
      peaqPrice,
    });
    if (row) {
      rows.push(row);
    }
  }

  return {
    tokens: rows,
    metadata: {
      fetchedAt: new Date().toISOString(),
      peaqPrice,
    },
  };
};

export { computeTokenBalances };


