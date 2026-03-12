import { useCallback, useMemo, useState } from 'react';

import { normalizeNumber } from '../../../lib/formatters';

const getSortableValue = (row, key, type) => {
  const value = row?.[key];
  if (type === 'alpha') {
    return typeof value === 'string' ? value : value?.toString() || '';
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9.-]+/g, '');
    const parsed = Number(sanitized);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  }
  if (value == null) return Number.NEGATIVE_INFINITY;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? Number.NEGATIVE_INFINITY : numeric;
};

const useTokenTableState = (tokenData = []) => {
  const [sortConfig, setSortConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHoldingsOnly, setShowHoldingsOnly] = useState(false);

  const sortedTokenData = useMemo(() => {
    if (!sortConfig) return tokenData;
    const { key, direction, type } = sortConfig;
    return [...tokenData].sort((a, b) => {
      const aValue = getSortableValue(a, key, type);
      const bValue = getSortableValue(b, key, type);
      if (type === 'alpha') {
        const compare = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        return direction === 'asc' ? compare : -compare;
      }
      if (aValue === bValue) return 0;
      const compare = aValue < bValue ? -1 : 1;
      return direction === 'asc' ? compare : -compare;
    });
  }, [tokenData, sortConfig]);

  const { filteredTokenData, portfolioStats } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = sortedTokenData.filter((token) => {
      const matchesSearch = term ? token.symbol.toLowerCase().includes(term) : true;
      const hasHoldings = normalizeNumber(token.userBalance) > 0;
      return matchesSearch && (!showHoldingsOnly || hasHoldings);
    });

    const totalUsd = filtered.reduce(
      (sum, token) => sum + normalizeNumber(token.userBalanceUSD),
      0,
    );
    const totalTokens = filtered.length;
    const withHoldings = filtered.filter(
      (token) => normalizeNumber(token.userBalance) > 0,
    ).length;
    const topHolding = filtered.reduce((best, token) => {
      const current = normalizeNumber(token.userBalanceUSD);
      const bestValue = best ? normalizeNumber(best.userBalanceUSD) : -Infinity;
      return current > bestValue ? token : best;
    }, null);

    return {
      filteredTokenData: filtered,
      portfolioStats: {
        totalUsd,
        totalTokens,
        withHoldings,
        topHolding,
      },
    };
  }, [sortedTokenData, searchTerm, showHoldingsOnly]);

  const handleSort = useCallback((key, type) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc';
        return { key, direction: nextDirection, type };
      }
      const initialDirection = type === 'alpha' ? 'asc' : 'desc';
      return { key, direction: initialDirection, type };
    });
  }, []);

  const toggleHoldingsFilter = useCallback(() => {
    setShowHoldingsOnly((prev) => !prev);
  }, []);

  return {
    sortConfig,
    handleSort,
    searchTerm,
    setSearchTerm,
    showHoldingsOnly,
    toggleHoldingsFilter,
    filteredTokenData,
    portfolioStats,
  };
};

export default useTokenTableState;

