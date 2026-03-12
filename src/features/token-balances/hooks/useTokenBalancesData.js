import { useEffect, useMemo, useState } from 'react';
import { getAddress, isAddress } from 'viem';

import { API_BASE_URL } from '../../../constants/api';
import { normalizeCoingeckoId } from '../../../lib/tokenPrices';

const isValidAddress = (value) => {
  try {
    return typeof value === 'string' && isAddress(value);
  } catch {
    return false;
  }
};

const buildTokenPayload = (tokens = {}) => {
  const payload = [];
  const seen = new Set();

  Object.values(tokens).forEach((details) => {
    if (!details?.symbol) return;
    const symbol = details.symbol.trim().toUpperCase();
    const decimals =
      Number.isInteger(details.decimals) && details.decimals >= 0 ? details.decimals : 18;
    const coingeckoId = normalizeCoingeckoId(details.extensions?.coingeckoId);

    if (symbol === 'PEAQ') {
      if (seen.has(symbol)) return;
      seen.add(symbol);
      payload.push({
        symbol,
        decimals,
        coingeckoId,
        address: 'PEAQ',
      });
      return;
    }

    if (!details.address || !isValidAddress(details.address)) {
      return;
    }

    const checksumAddress = getAddress(details.address);
    if (seen.has(checksumAddress)) return;
    seen.add(checksumAddress);

    payload.push({
      symbol,
      decimals,
      coingeckoId,
      address: checksumAddress,
    });
  });

  return payload;
};

const buildLogoLookup = (tokens = {}) => {
  const lookup = new Map();
  Object.values(tokens).forEach((details) => {
    if (!details?.logo) return;
    const symbol = details.symbol?.toUpperCase();
    if (symbol) {
      lookup.set(symbol, details.logo);
    }
    if (details.address && isValidAddress(details.address)) {
      lookup.set(getAddress(details.address), details.logo);
    } else if (details.address === 'PEAQ' || symbol === 'PEAQ') {
      lookup.set('PEAQ', details.logo);
    }
  });
  return lookup;
};

const attachLogos = (rows, logoLookup) =>
  rows.map((row) => {
    const normalizedAddress =
      row.tokenAddress && isValidAddress(row.tokenAddress) ? getAddress(row.tokenAddress) : null;
    const logo =
      (normalizedAddress && logoLookup.get(normalizedAddress)) ||
      logoLookup.get(row.symbol?.toUpperCase()) ||
      '';
    return { ...row, logo };
  });

const useTokenBalancesData = ({ address, tokens }) => {
  const [tokenData, setTokenData] = useState([]);
  const [loading, setLoading] = useState(false);

  const tokenPayload = useMemo(() => buildTokenPayload(tokens), [tokens]);
  const logoLookup = useMemo(() => buildLogoLookup(tokens), [tokens]);

  useEffect(() => {
    setTokenData([]);
  }, [address]);

  useEffect(() => {
    if (!address || !tokenPayload.length) {
      setTokenData([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/token-balances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: address,
            tokens: tokenPayload,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Token balance request failed: ${response.status}`);
        }
        const data = await response.json();
        const rows = Array.isArray(data?.tokens) ? data.tokens : [];
        if (!isMounted) return;
        setTokenData(attachLogos(rows, logoLookup));
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to fetch token balances from backend', error);
        if (isMounted) {
          setTokenData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBalances();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [address, tokenPayload, logoLookup]);

  return { loading, tokenData };
};

export default useTokenBalancesData;

