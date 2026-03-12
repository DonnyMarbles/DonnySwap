import {
  Toolbar,
  SearchInput,
  ToggleGroup,
  ToggleButton,
} from '../../../styles/TokenBalancesStyles';

const TokenBalancesToolbar = ({
  searchTerm,
  onSearchChange,
  showHoldingsOnly,
  onToggleHoldings,
}) => (
  <Toolbar>
    <SearchInput
      type="search"
      placeholder="Search token symbol..."
      value={searchTerm}
      onChange={(event) => onSearchChange(event.target.value)}
      aria-label="Search tokens by symbol"
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
  </Toolbar>
);

export default TokenBalancesToolbar;

