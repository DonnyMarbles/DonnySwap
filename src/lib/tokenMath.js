import { formatUnits, parseUnits, decodeEventLog } from 'viem';

export const safeParseUnits = (value, decimals) => {
  try {
    const numeric = Number(value ?? 0);
    const trimmedValue = Number.isFinite(numeric) ? numeric.toFixed(decimals) : '0';
    return parseUnits(trimmedValue, decimals);
  } catch (error) {
    console.error(`Failed to parse value: ${value}, with decimals: ${decimals}`, error);
    return 0n;
  }
};

export const safeFormatUnits = (value, decimals) => {
  try {
    return formatUnits(value ?? 0n, decimals);
  } catch (error) {
    console.error(`Failed to format value: ${value}, with decimals: ${decimals}`, error);
    return '0.00';
  }
};

export const MAX_PRICE_IMPACT_PERCENT = 99.99;

export const getPriceImpactColor = (impact) => {
  const absImpact = Math.abs(impact);
  if (absImpact < 3) return '#4caf50';
  if (absImpact < 10) return '#000000';
  return '#f44336';
};

export const calculatePriceImpact = ({ expectedAmountOut, exchangeRate, amountIn }) => {
  const rateNumber = Number(exchangeRate);
  const amountNumber = Number(amountIn);
  const expectedNumber = Number(expectedAmountOut);

  if (rateNumber <= 0 || amountNumber <= 0 || !Number.isFinite(expectedNumber)) {
    return 0;
  }
  const idealAmountOut = amountNumber * rateNumber;
  if (idealAmountOut <= 0) return 0;

  const rawImpact = ((idealAmountOut - expectedNumber) / idealAmountOut) * 100;
  return Math.max(-MAX_PRICE_IMPACT_PERCENT, Math.min(rawImpact, MAX_PRICE_IMPACT_PERCENT));
};

export const extractReceivedAmount = ({ receipt, tokenAddress, decimals, account, ERC20ABI }) => {
  if (!receipt?.logs?.length || !tokenAddress || !account) return null;
  const normalizedToken =
    typeof tokenAddress === 'string'
      ? tokenAddress.toLowerCase()
      : tokenAddress?.toString().toLowerCase();
  const normalizedAccount = account.toLowerCase();

  for (const log of receipt.logs) {
    if ((log.address || '').toLowerCase() !== normalizedToken) continue;
    try {
      const decoded = decodeEventLog({
        abi: ERC20ABI,
        data: log.data,
        topics: log.topics,
      });
      if (
        decoded.eventName === 'Transfer' &&
        decoded.args?.to?.toLowerCase() === normalizedAccount
      ) {
        return formatUnits(decoded.args.value, decimals);
      }
    } catch (err) {
      console.debug('Failed to decode transfer log', err);
    }
  }
  return null;
};