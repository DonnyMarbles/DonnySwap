import { getSupplyStats } from './supplyService.js';
import { getUserBalance } from './rpcService.js';
import { getPeaqPrice } from './marketDataService.js';
import { bigIntToNumber } from '../utils/data.js';

const buildPeaqMetrics = async ({ userAddress, burnedTokens, peaqPriceOverride }) => {
  const [supplyStats, userBalance, resolvedPrice] = await Promise.all([
    getSupplyStats(),
    getUserBalance(userAddress),
    peaqPriceOverride != null ? Promise.resolve(peaqPriceOverride) : getPeaqPrice(),
  ]);

  const { totalIssuance, circulatingSupply } = supplyStats;
  const burnedAmount = typeof burnedTokens === 'bigint' ? burnedTokens : BigInt(burnedTokens || 0);

  const totalSupplyNumber = bigIntToNumber(totalIssuance);
  const circulatingNumber = bigIntToNumber(circulatingSupply);
  const burnedNumber = bigIntToNumber(burnedAmount);
  const userBalanceNumber = bigIntToNumber(userBalance);

  const burnedPct = totalSupplyNumber === 0 ? 0 : (burnedNumber * 100) / totalSupplyNumber;
  const userSharePct = totalSupplyNumber === 0 ? 0 : (userBalanceNumber * 100) / totalSupplyNumber;

  const burnedPercentage = burnedPct < 0.01 ? '<0.01' : burnedPct.toFixed(2);
  const userShare = userSharePct < 0.01 ? '<0.01' : userSharePct.toFixed(2);

  const priceToUse =
    typeof resolvedPrice === 'number' && !Number.isNaN(resolvedPrice) ? resolvedPrice : 0;

  const marketCap =
    priceToUse && circulatingNumber > 0 ? (circulatingNumber * priceToUse).toFixed(2) : '0.00';
  const userBalanceUSD =
    priceToUse && userBalanceNumber > 0 ? (userBalanceNumber * priceToUse).toFixed(2) : '0.00';

  return {
    totalSupply: totalSupplyNumber.toFixed(6),
    circulatingSupply: circulatingNumber.toFixed(6),
    userBalance: userBalanceNumber.toFixed(6),
    totalBurnedTokens: burnedNumber.toFixed(6),
    burnedPercentage,
    userShare,
    marketCap,
    userBalanceUSD,
    peaqPrice: priceToUse || null,
  };
};

export { buildPeaqMetrics };

