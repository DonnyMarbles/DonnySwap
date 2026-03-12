import { StatGrid, StatCard } from '../../../styles/TokenBalancesStyles';
import { formatUsdCompact, normalizeNumber } from '../../../lib/formatters';

const PortfolioStatsGrid = ({ stats }) => {
  if (!stats) return null;

  return (
    <StatGrid>
      <StatCard>
        <h4>Total Portfolio (USD)</h4>
        <p>{formatUsdCompact(stats.totalUsd)}</p>
        <span>Across filtered tokens</span>
      </StatCard>
      <StatCard>
        <h4>Tracked Tokens</h4>
        <p>{stats.totalTokens}</p>
        <span>{stats.withHoldings} with holdings</span>
      </StatCard>
      <StatCard>
        <h4>Top Holding</h4>
        <p>{stats.topHolding ? `${stats.topHolding.symbol}` : '—'}</p>
        <span>
          {stats.topHolding
            ? formatUsdCompact(normalizeNumber(stats.topHolding.userBalanceUSD))
            : 'No balance'}
        </span>
      </StatCard>
    </StatGrid>
  );
};

export default PortfolioStatsGrid;

