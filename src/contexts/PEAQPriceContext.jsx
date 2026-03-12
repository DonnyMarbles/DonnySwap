import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../constants/api';

export const PEAQPriceContext = createContext();

const PRICE_REFRESH_MS = 45000;
const CACHE_TTL_MS = 60000;
const PRICE_CACHE_KEY = 'donnyswap::peaqPrice';

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
};

const readCachedEntry = () => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.price !== 'number' || typeof parsed?.timestamp !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const persistCachedEntry = (price, timestamp = Date.now()) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PRICE_CACHE_KEY, JSON.stringify({ price, timestamp }));
  } catch {
    // Ignore storage write failures (e.g. privacy mode)
  }
};

const isCacheFresh = (entry) =>
  entry && typeof entry.timestamp === 'number' && Date.now() - entry.timestamp < CACHE_TTL_MS;

export const PEAQPriceProvider = ({ children }) => {
  const cachedEntry = readCachedEntry();
  const [PEAQPrice, setPEAQPrice] = useState(cachedEntry?.price ?? 0);
  const [loading, setLoading] = useState(!cachedEntry);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(cachedEntry?.timestamp ?? 0);
  const lastFetchedRef = useRef(cachedEntry?.timestamp ?? 0);
  const timerRef = useRef(null);
  const inFlightRef = useRef(null);

  const applyPrice = useCallback((price, timestamp = Date.now()) => {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return;
    }
    setPEAQPrice(numericPrice);
    setError(false);
    setLoading(false);
    setLastUpdated(timestamp);
    lastFetchedRef.current = timestamp;
    persistCachedEntry(numericPrice, timestamp);
  }, []);

  const fetchLatestPrice = useCallback(
    async ({ force = false } = {}) => {
      const now = Date.now();
      const cached = readCachedEntry();
      if (!force && cached && isCacheFresh(cached)) {
        applyPrice(cached.price, cached.timestamp);
        return cached.price;
      }

      if (!force && now - lastFetchedRef.current < PRICE_REFRESH_MS && PEAQPrice) {
        return PEAQPrice;
      }

      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      if (!PEAQPrice) {
        setLoading(true);
      }

      inFlightRef.current = (async () => {
        try {
          const response = await axios.get(apiUrl('fetch-peaq-price'));
          const nextPrice = Number(response?.data?.price);
          if (!Number.isFinite(nextPrice)) {
            throw new Error('Invalid PEAQ price payload');
          }
          applyPrice(nextPrice);
          return nextPrice;
        } catch (err) {
          console.error('Error fetching PEAQ price:', err);
          setError(true);
          throw err;
        } finally {
          inFlightRef.current = null;
          setLoading(false);
        }
      })();

      return inFlightRef.current;
    },
    [PEAQPrice, applyPrice],
  );

  useEffect(() => {
    let cancelled = false;

    const tick = async (force = false) => {
      try {
        await fetchLatestPrice({ force });
      } catch {
        // Errors already logged in fetchLatestPrice
      } finally {
        if (!cancelled) {
          timerRef.current = setTimeout(() => tick(true), PRICE_REFRESH_MS);
        }
      }
    };

    tick(false);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fetchLatestPrice]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestPrice();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchLatestPrice]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event) => {
      if (event.key !== PRICE_CACHE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        if (typeof parsed?.price === 'number' && typeof parsed?.timestamp === 'number') {
          applyPrice(parsed.price, parsed.timestamp);
        }
      } catch {
        // Ignore malformed cache entries
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [applyPrice]);

  const refresh = useCallback(() => fetchLatestPrice({ force: true }), [fetchLatestPrice]);

  return (
    <PEAQPriceContext.Provider value={{ PEAQPrice, loading, error, lastUpdated, refresh }}>
      {children}
    </PEAQPriceContext.Provider>
  );
};

export const usePEAQPrice = () => {
  const context = useContext(PEAQPriceContext);
  if (!context) throw new Error('usePEAQPrice must be used within PEAQPriceProvider');
  return context;
};
