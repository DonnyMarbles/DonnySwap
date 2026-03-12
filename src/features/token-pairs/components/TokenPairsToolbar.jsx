import {
  Toolbar,
  ToolbarControls,
  SearchInput,
  ToggleGroup,
  ToggleButton,
  ToolbarStatsGrid,
  ToolbarStatCard,
} from '../../../styles/TokenPairsStyles';
import { formatCurrency } from '../../../lib/formatters';

const TokenPairsToolbar = ({
  searchTerm,
  onSearchChange,
  showHoldingsOnly,
  onToggleHoldings,
  portfolioStats,
}) => (
  <Toolbar>
    <ToolbarControls>
      <SearchInput
        type="search"
        placeholder="Search pair or token symbol..."
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="Search token pairs by symbol"
      />
      <ToggleGroup>
        <ToggleButton
          type="button"
          aria-pressed={showHoldingsOnly}
          onClick={onToggleHoldings}
        >
          {showHoldingsOnly ? 'Showing holdings' : 'Show holdings only'}
        </ToggleButton>
      </ToggleGroup>
    </ToolbarControls>
    {portfolioStats && (
      <ToolbarStatsGrid>
        <ToolbarStatCard>
          <h4>LP Portfolio (USD)</h4>
          <p>{formatCurrency(portfolioStats.totalUsd)}</p>
          <span>Across shown pools</span>
        </ToolbarStatCard>
        <ToolbarStatCard>
          <h4>Active Pools</h4>
          <p>{portfolioStats.activePools}</p>
          <span>{portfolioStats.shownPools} shown</span>
        </ToolbarStatCard>
        <ToolbarStatCard>
          <h4>Top Position</h4>
          <p>{portfolioStats.topPosition ? portfolioStats.topPosition.label : '—'}</p>
          <span>
            {portfolioStats.topPosition
              ? formatCurrency(portfolioStats.topPosition.usdValue)
              : 'No LP balance'}
          </span>
        </ToolbarStatCard>
      </ToolbarStatsGrid>
    )}
  </Toolbar>
);

export default TokenPairsToolbar;


