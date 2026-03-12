import {
  TableWrapper,
  StyledTable,
  LogoCell,
  LogoButton,
  PercentageCell,
  BurnPercentageCell,
  SortButton,
} from '../../../styles/TokenBalancesStyles';
import { formatUsdPrice, formatCompactNumber } from '../../../lib/formatters';

const renderSortIndicator = (sortConfig, key) => {
  if (!sortConfig || sortConfig.key !== key) return '⇅';
  return sortConfig.direction === 'asc' ? '▲' : '▼';
};

const TokenBalancesTable = ({ tokens, sortConfig, onSort, onLogoClick }) => {
  if (!tokens?.length) return null;

  const renderCompactValue = (
    value,
    {
      prefix = '',
      minFractionDigits = 2,
      maxFractionDigits = 2,
      highlightPositive = false,
      highlightClass = 'positive',
    } = {},
  ) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return <span className="numeric">N/A</span>;
    }

    const shouldHighlight = highlightPositive && numericValue > 0;

    const title = `${prefix}${numericValue.toLocaleString('en-US', {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    })}`;

    const compact = `${prefix}${formatCompactNumber(numericValue, {
      minimumFractionDigits: 0,
      maximumFractionDigits: numericValue >= 100 ? 2 : 4,
    })}`;

    const classNames = ['numeric'];
    if (shouldHighlight) classNames.push(highlightClass);

    return <span className={classNames.join(' ')} title={title}>{compact}</span>;
  };

  const renderUsdPriceCell = (value) => {
    const numericValue = Number(value);
    const shouldHighlight = Number.isFinite(numericValue) && numericValue > 0;
    return (
      <span className={`numeric${shouldHighlight ? ' positive' : ''}`}>{formatUsdPrice(value)}</span>
    );
  };

  const renderSortableHeader = (label, key, type) => (
    <th>
      <SortButton
        type="button"
        onClick={() => onSort(key, type)}
        aria-pressed={sortConfig?.key === key}
      >
        <span className="label">{label}</span>
        <span className="indicator">{renderSortIndicator(sortConfig, key)}</span>
      </SortButton>
    </th>
  );

  return (
    <TableWrapper>
      <StyledTable>
        <thead>
          <tr>
            <th>Logo</th>
            {renderSortableHeader('Symbol', 'symbol', 'alpha')}
            {renderSortableHeader('Token Price (USD)', 'usdPrice', 'numeric')}
            {renderSortableHeader('Total Supply', 'totalSupply', 'numeric')}
            {renderSortableHeader('Circulating Supply', 'circulatingSupply', 'numeric')}
            {renderSortableHeader('Circulating Market Cap', 'marketCap', 'numeric')}
            {renderSortableHeader('Your Balance', 'userBalance', 'numeric')}
            {renderSortableHeader('Your Balance USD', 'userBalanceUSD', 'numeric')}
            {renderSortableHeader('Your % of Total Supply', 'userShare', 'numeric')}
            {renderSortableHeader('Tokens 🔥 or in 🔥 LP', 'totalBurnedTokens', 'numeric')}
            {renderSortableHeader('% Total Supply 🔥', 'burnedPercentage', 'numeric')}
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.symbol}>
              <LogoCell data-label="Logo">
                <LogoButton
                  type="button"
                  onClick={() => onLogoClick(token)}
                  disabled={!token.tokenAddress}
                  title={
                    token.tokenAddress
                      ? 'Add this token to your wallet'
                      : 'Token cannot be added automatically'
                  }
                >
                  <img src={token.logo} alt={token.symbol} />
                </LogoButton>
              </LogoCell>
              <td data-label="Symbol">
                <a
                  href={
                    token.symbol === 'PEAQ'
                      ? `https://www.coingecko.com/en/coins/peaq`
                      : `https://peaq.subscan.io/token/${token.tokenAddress}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {token.symbol}
                </a>
              </td>
              <td data-label="Token Price (USD)">{renderUsdPriceCell(token.usdPrice)}</td>
              <td data-label="Total Supply">
                {renderCompactValue(token.totalSupply)}
              </td>
              <td data-label="Circulating Supply">
                {renderCompactValue(token.circulatingSupply)}
              </td>
              <td data-label="Circulating Market Cap">
                {renderCompactValue(token.marketCap, { prefix: '$', highlightPositive: true })}
              </td>
              <td data-label="Your Balance">
                {renderCompactValue(token.userBalance, { highlightPositive: true })}
              </td>
              <td data-label="Your Balance USD">
                {renderCompactValue(token.userBalanceUSD, { prefix: '$', highlightPositive: true })}
              </td>
              <PercentageCell data-label="Your % of Total Supply" percentage={token.userShare}>
                {token.userShare}%
              </PercentageCell>
              <td data-label="Burned or LP Tokens 🔥">
                {renderCompactValue(token.totalBurnedTokens, {
                  highlightPositive: true,
                  highlightClass: 'burn',
                })}
              </td>
              <BurnPercentageCell
                data-label="% Total Supply 🔥"
                percentage={token.burnedPercentage}
              >
                {token.burnedPercentage}%
              </BurnPercentageCell>
            </tr>
          ))}
        </tbody>
      </StyledTable>
    </TableWrapper>
  );
};

export default TokenBalancesTable;

