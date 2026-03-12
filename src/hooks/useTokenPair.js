import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits, getAddress } from 'viem';
import { MAX_UINT256, ZERO, ZERO_ADDRESS } from '../lib/viemHelpers';
import { fetchTokenUsdPrices, normalizeCoingeckoId } from '../lib/tokenPrices';

const MAX = MAX_UINT256;
const TOKEN_PRICE_REFRESH_MS = 60_000;

const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_DECIMALS = 8;

/**
 * Shared state + helpers for views that deal with a pair of tokens.
 * Components such as Swap, Add Liquidity, and Remove Liquidity have historically
 * re-implemented all of this logic. Centralising it here makes the UI leaner
 * and keeps business logic in one place.
 */
const useTokenPair = ({
  publicClient,
  account,
  routerAddress,
  tokens,
  ERC20ABI,
  pairABI,
  factoryABI,
  factoryAddress,
  wrappedTokenAddress,
  pricePerNative, // Optional USD price for PEAQ
  pollInterval = DEFAULT_POLL_INTERVAL,
}) => {
  const [tokenIn, setTokenIn] = useState('default');
  const [tokenOut, setTokenOut] = useState('default');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  const [balanceInUSD, setBalanceInUSD] = useState('0');
  const [balanceOutUSD, setBalanceOutUSD] = useState('0');
  const [tokenPrices, setTokenPrices] = useState({});
  const [allowanceIn, setAllowanceIn] = useState(ZERO);
  const [allowanceOut, setAllowanceOut] = useState(ZERO);
  const [needsApprovalIn, setNeedsApprovalIn] = useState(false);
  const [needsApprovalOut, setNeedsApprovalOut] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [noLiquidity, setNoLiquidity] = useState(false);
  const [error, setError] = useState('');
  const [blockNumber, setBlockNumber] = useState(0);

  const toFixedDown = useCallback((value, decimals = DEFAULT_DECIMALS) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return Number(0).toFixed(decimals);
    }
    const factor = Math.pow(10, decimals);
    return (Math.floor(Number(value) * factor) / factor).toFixed(decimals);
  }, []);

  const getTokenMeta = useCallback(
    (tokenKey) => {
      if (!tokenKey || tokenKey === 'default') return null;
      return tokens?.[tokenKey] || null;
    },
    [tokens]
  );

  const getTokenDecimals = useCallback(
    (tokenKey) => {
      if (!tokenKey || tokenKey === 'default') return 18;
      if (tokenKey === 'PEAQ') return 18;
      return tokens?.[tokenKey]?.decimals ?? 18;
    },
    [tokens]
  );

  const getTokenAddress = useCallback(
    (tokenKey) => {
      if (!tokenKey || tokenKey === 'default') return null;
      if (tokenKey === 'PEAQ') return null;
      return tokens?.[tokenKey]?.address ?? tokenKey;
    },
    [tokens]
  );

  const getErc20Address = useCallback(
    (tokenKey) => {
      if (!tokenKey || tokenKey === 'default') return null;
      if (tokenKey === 'PEAQ') return wrappedTokenAddress || null;
      return getTokenAddress(tokenKey);
    },
    [getTokenAddress, wrappedTokenAddress]
  );

  const getTokenUsdPrice = useCallback(
    (tokenKey) => {
      if (!tokenKey || tokenKey === 'default') return 0;

      if (tokenKey === 'PEAQ') {
        return Number(pricePerNative) || 0;
      }

      const tokenMeta = getTokenMeta(tokenKey);
      if (!tokenMeta) return 0;

      const normalizedWrapped =
        typeof wrappedTokenAddress === 'string' ? wrappedTokenAddress.toLowerCase() : '';
      const normalizedKey = typeof tokenKey === 'string' ? tokenKey.toLowerCase() : '';
      const isWrappedNative =
        (normalizedWrapped && normalizedKey === normalizedWrapped) ||
        tokenMeta.symbol?.toUpperCase() === 'WPEAQ';

      if (isWrappedNative && pricePerNative) {
        return Number(pricePerNative) || 0;
      }

      const coingeckoId = normalizeCoingeckoId(tokenMeta.extensions?.coingeckoId);
      if (!coingeckoId) return 0;

      const priceRaw = tokenPrices?.[coingeckoId];
      const priceValue = typeof priceRaw === 'number' ? priceRaw : Number(priceRaw ?? 0);
      if (!Number.isFinite(priceValue) || priceValue <= 0) return 0;
      return priceValue;
    },
    [getTokenMeta, pricePerNative, tokenPrices, wrappedTokenAddress]
  );

  const computeUsd = useCallback(
    (tokenKey, balance) => {
      const tokenPrice = getTokenUsdPrice(tokenKey);
      if (!tokenPrice) return '0';
      const numericBalance = Number(balance);
      if (Number.isNaN(numericBalance)) return '0';
      return toFixedDown(numericBalance * tokenPrice, 2);
    },
    [getTokenUsdPrice, toFixedDown]
  );

  const fetchBalance = useCallback(
    async (tokenKey) => {
      if (!publicClient || !account || !tokenKey || tokenKey === 'default') return '0';

      let balanceRaw;
      if (tokenKey === 'PEAQ') {
        balanceRaw = await publicClient.getBalance({ address: account });
      } else {
        balanceRaw = await publicClient.readContract({
          address: getTokenAddress(tokenKey),
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [account],
        });
      }
      const decimals = getTokenDecimals(tokenKey);
      return toFixedDown(Number(formatUnits(balanceRaw, decimals)));
    },
    [publicClient, account, ERC20ABI, getTokenAddress, getTokenDecimals, toFixedDown]
  );

  const fetchAllowance = useCallback(
    async (tokenKey) => {
      if (!publicClient || !account || !routerAddress || !tokenKey || tokenKey === 'default') return ZERO;
      if (tokenKey === 'PEAQ') return MAX;
      const tokenAddress = getTokenAddress(tokenKey);
      if (!tokenAddress) return ZERO;
      return publicClient.readContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [account, routerAddress],
      });
    },
    [publicClient, account, routerAddress, ERC20ABI, getTokenAddress]
  );

  const requiresApproval = useCallback(
    (tokenKey, amount, allowance) => {
      if (!tokenKey || tokenKey === 'default' || tokenKey === 'PEAQ') return false;
      if (!amount || Number(amount) <= 0 || allowance === undefined || allowance === null) return false;
      try {
        const parsed = parseUnits(String(amount), getTokenDecimals(tokenKey));
        return parsed > allowance;
      } catch (err) {
        console.error('Error parsing approval amount', err);
        return true;
      }
    },
    [getTokenDecimals]
  );

  const getPairAddress = useCallback(
    async (tokenKeyA, tokenKeyB) => {
      if (!publicClient || !factoryAddress || !tokenKeyA || !tokenKeyB) return ZERO_ADDRESS;
      if (tokenKeyA === tokenKeyB) return ZERO_ADDRESS;

      const tokenAddressA = getErc20Address(tokenKeyA);
      const tokenAddressB = getErc20Address(tokenKeyB);

      if (!tokenAddressA || !tokenAddressB) return ZERO_ADDRESS;

      const pairAddress = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryABI,
        functionName: 'getPair',
        args: [tokenAddressA, tokenAddressB],
      });
      return pairAddress && pairAddress !== ZERO_ADDRESS ? getAddress(pairAddress) : ZERO_ADDRESS;
    },
    [publicClient, factoryAddress, factoryABI, getErc20Address]
  );

  const refreshExchangeRate = useCallback(
    async (tokenKeyA, tokenKeyB) => {
      if (!publicClient || !tokenKeyA || !tokenKeyB) {
        setExchangeRate(null);
        setNoLiquidity(false);
        return;
      }

      try {
        const pairAddress = await getPairAddress(tokenKeyA, tokenKeyB);
        if (!pairAddress || pairAddress === ZERO_ADDRESS) {
          setExchangeRate(null);
          setNoLiquidity(true);
          return;
        }

        const reserves = await publicClient.readContract({
          address: pairAddress,
          abi: pairABI,
          functionName: 'getReserves',
        });
        const token0 = await publicClient.readContract({
          address: pairAddress,
          abi: pairABI,
          functionName: 'token0',
        });
        const tokenAddressA = getErc20Address(tokenKeyA);
        const [reserve0, reserve1] = reserves;

        let reserveA = reserve0;
        let reserveB = reserve1;
        if (tokenAddressA && tokenAddressA.toLowerCase() !== token0.toLowerCase()) {
          reserveA = reserve1;
          reserveB = reserve0;
        }

        if (reserveA === ZERO || reserveB === ZERO) {
          setExchangeRate(null);
          setNoLiquidity(true);
          return;
        }

        const formattedA = Number(
          formatUnits(reserveA, getTokenDecimals(tokenKeyA === 'PEAQ' ? wrappedTokenAddress : tokenKeyA))
        );
        const formattedB = Number(
          formatUnits(reserveB, getTokenDecimals(tokenKeyB === 'PEAQ' ? wrappedTokenAddress : tokenKeyB))
        );
        setExchangeRate(formattedB / formattedA);
        setNoLiquidity(false);
      } catch (err) {
        console.error('Error calculating exchange rate', err);
        setExchangeRate(null);
        setNoLiquidity(false);
      }
    },
    [publicClient, pairABI, getErc20Address, getPairAddress, getTokenDecimals, wrappedTokenAddress]
  );

  useEffect(() => {
    if (!publicClient) return undefined;
    let mounted = true;
    const tick = async () => {
      try {
        const bn = await publicClient.getBlockNumber();
        if (mounted) setBlockNumber(bn);
      } catch (err) {
        console.error('Failed to fetch block number', err);
      }
    };
    tick();
    const interval = setInterval(tick, pollInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [publicClient, pollInterval]);

  useEffect(() => {
    if (!account) return;
    if (tokenIn && tokenIn !== 'default') {
      fetchBalance(tokenIn).then((value) => {
        setBalanceIn(value);
      });
      fetchAllowance(tokenIn).then((value) => {
        setAllowanceIn(value);
        setNeedsApprovalIn(requiresApproval(tokenIn, amountIn, value));
      });
    } else {
      setBalanceIn('0');
      setAllowanceIn(ZERO);
      setNeedsApprovalIn(false);
    }
  }, [account, tokenIn, blockNumber, fetchBalance, fetchAllowance, requiresApproval, amountIn]);

  useEffect(() => {
    if (!tokenIn || tokenIn === 'default') {
      setBalanceInUSD('0');
      return;
    }
    setBalanceInUSD(computeUsd(tokenIn, balanceIn));
  }, [tokenIn, balanceIn, computeUsd]);

  useEffect(() => {
    if (!account) return;
    if (tokenOut && tokenOut !== 'default') {
      fetchBalance(tokenOut).then((value) => {
        setBalanceOut(value);
      });
      fetchAllowance(tokenOut).then((value) => {
        setAllowanceOut(value);
        setNeedsApprovalOut(requiresApproval(tokenOut, amountOut, value));
      });
    } else {
      setBalanceOut('0');
      setAllowanceOut(ZERO);
      setNeedsApprovalOut(false);
    }
  }, [account, tokenOut, blockNumber, fetchBalance, fetchAllowance, requiresApproval, amountOut]);

  useEffect(() => {
    if (!tokenOut || tokenOut === 'default') {
      setBalanceOutUSD('0');
      return;
    }
    setBalanceOutUSD(computeUsd(tokenOut, balanceOut));
  }, [tokenOut, balanceOut, computeUsd]);

  useEffect(() => {
    if (tokenIn && tokenOut && tokenIn !== 'default' && tokenOut !== 'default') {
      refreshExchangeRate(tokenIn, tokenOut);
    } else {
      setExchangeRate(null);
      setNoLiquidity(false);
    }
  }, [tokenIn, tokenOut, refreshExchangeRate, blockNumber]);

  useEffect(() => {
    let abort = false;

    if (!tokens || !Object.keys(tokens).length) {
      setTokenPrices({});
      return () => {
        abort = true;
      };
    }

    const loadPrices = async () => {
      const priceMap = await fetchTokenUsdPrices(tokens);
      if (!abort) {
        setTokenPrices(priceMap);
      }
    };

    loadPrices();
    const intervalId = setInterval(loadPrices, TOKEN_PRICE_REFRESH_MS);

    return () => {
      abort = true;
      clearInterval(intervalId);
    };
  }, [tokens]);

  const handleSelectTokenIn = useCallback(
    (nextTokenKey) => {
      if (!nextTokenKey) return;
      setTokenIn(nextTokenKey);
      if (nextTokenKey === tokenOut) {
        setTokenOut('default');
      }
    },
    [tokenOut]
  );

  const handleSelectTokenOut = useCallback(
    (nextTokenKey) => {
      if (!nextTokenKey) return;
      setTokenOut(nextTokenKey);
      if (nextTokenKey === tokenIn) {
        setTokenIn('default');
      }
    },
    [tokenIn]
  );

  const syncAmountsFromIn = useCallback(
    (value) => {
      setAmountIn(value);
      setNeedsApprovalIn(requiresApproval(tokenIn, value, allowanceIn));
    },
    [tokenIn, allowanceIn, requiresApproval]
  );

  const syncAmountsFromOut = useCallback(
    (value) => {
      setAmountOut(value);
      if (exchangeRate && Number(value) > 0) {
        setAmountIn(toFixedDown(Number(value) / exchangeRate));
      }
      setNeedsApprovalOut(requiresApproval(tokenOut, value, allowanceOut));
    },
    [exchangeRate, toFixedDown, tokenOut, allowanceOut, requiresApproval]
  );

  const handleBalanceClickIn = useCallback(() => {
    syncAmountsFromIn(balanceIn);
  }, [balanceIn, syncAmountsFromIn]);

  const handleBalanceClickOut = useCallback(() => {
    syncAmountsFromOut(balanceOut);
  }, [balanceOut, syncAmountsFromOut]);

  const tokenOptions = useMemo(() => Object.keys(tokens || {}), [tokens]);

  return {
    state: {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      balanceIn,
      balanceOut,
      balanceInUSD,
      balanceOutUSD,
      allowanceIn,
      allowanceOut,
      needsApprovalIn,
      needsApprovalOut,
      exchangeRate,
      noLiquidity,
      error,
    blockNumber,
    },
    setters: {
      setError,
      setAmountIn,
      setAmountOut,
      setTokenIn,
      setTokenOut,
      setNeedsApprovalIn,
      setNeedsApprovalOut,
      setAllowanceIn,
      setAllowanceOut,
    },
    actions: {
      handleSelectTokenIn,
      handleSelectTokenOut,
      handleAmountInChange: syncAmountsFromIn,
      handleAmountOutChange: syncAmountsFromOut,
      handleBalanceClickIn,
      handleBalanceClickOut,
      refreshExchangeRate,
    },
    helpers: {
      toFixedDown,
      getTokenMeta,
      getTokenAddress,
      getTokenDecimals,
      getPairAddress,
      getTokenUsdPrice,
      tokenOptions,
    },
  };
};

export default useTokenPair;

