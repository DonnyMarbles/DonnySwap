import { formatUnits } from 'viem';

export const formatTokenAmount = (value, decimals = 18, fractionDigits = 2) => {
  if (value == null) return '0.00';
  try {
    return Number(formatUnits(value, decimals)).toFixed(fractionDigits);
  } catch {
    return '0.00';
  }
};

export const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '$0.00';
  return `$${numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0.00%';
  return `${numeric.toFixed(2)}%`;
};

export const formatUsdPrice = (value) => {
  if (value == null) return 'N/A';
  const numericPrice = Number(value);
  if (Number.isNaN(numericPrice)) return 'N/A';
  const formatOptions =
    numericPrice >= 1
      ? { minimumFractionDigits: 2, maximumFractionDigits: 4 }
      : { minimumFractionDigits: 4, maximumFractionDigits: 6 };
  return `$${numericPrice.toLocaleString('en-US', formatOptions)}`;
};

export const formatUsdCompact = (value) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
    notation: value >= 1000000 ? 'compact' : 'standard',
  });
  return formatter.format(value);
};

export const normalizeNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const numeric = Number(value.toString().replace(/[^0-9.-]+/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const formatCompactNumber = (value, fractionDigits = { minimumFractionDigits: 0, maximumFractionDigits: 2 }) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: fractionDigits.minimumFractionDigits,
    maximumFractionDigits: fractionDigits.maximumFractionDigits,
  });
  return formatter.format(numeric);
};
