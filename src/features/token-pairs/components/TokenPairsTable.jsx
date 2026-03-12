import { StyledTable, LogoCell, PercentageCell } from '../../../styles/TokenPairsStyles';
import { formatTokenAmount, formatCurrency, formatPercentage } from '../../../lib/formatters';

const TokenPairsTable = ({ pairs }) => {
  if (!pairs?.length) {
    return (
      <StyledTable>
        <thead>
          <tr>
            <th>Pair&rsquo;s Logos</th>
            <th>Symbol</th>
            <th>Reserves</th>
            <th>Total LP Tokens</th>
            <th>Total LP Tokens $USD</th>
            <th>Your LP Balance</th>
            <th>Your LP Balance $USD</th>
            <th>Your LP Share %</th>
            <th>Total LP Tokens 🔥</th>
            <th>% Total LP Tokens 🔥</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={10}>No pairs found.</td>
          </tr>
        </tbody>
      </StyledTable>
    );
  }

  return (
    <StyledTable>
      <thead>
        <tr>
          <th>Pair&rsquo;s Logos</th>
          <th>Symbol</th>
          <th>Reserves</th>
          <th>Total LP Tokens</th>
          <th>Total LP Tokens $USD</th>
          <th>Your LP Balance</th>
          <th>Your LP Balance $USD</th>
          <th>Your LP Share %</th>
          <th>Total LP Tokens 🔥</th>
          <th>% Total LP Tokens 🔥</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => (
          <tr key={pair.pairAddress}>
            <LogoCell data-label="Logos">
              <div className="logos">
                <a
                  href={`https://peaq.subscan.io/account/${pair.tokenAAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={pair.tokenALogo} alt={pair.tokenASymbol} />
                </a>
                <a
                  href={`https://peaq.subscan.io/account/${pair.tokenBAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={pair.tokenBLogo} alt={pair.tokenBSymbol} />
                </a>
              </div>
            </LogoCell>
            <td data-label="Pair">
              <a
                href={`https://peaq.subscan.io/account/${pair.pairAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {pair.tokenASymbol}<br />{pair.tokenBSymbol}
              </a>
            </td>
            <td data-label="Reserves" className="inline-cell">
              <div className="inline-cell-content">
                <strong>
                <a
                  href={`https://peaq.subscan.io/account/${pair.tokenAAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="token-link"
                >
                  <span className="amount">{formatTokenAmount(pair.reserves[0], pair.tokenADecimals)}</span>
                  <span className="ticker">{pair.tokenASymbol}</span>
                </a>
                </strong>
                <span className="divider"></span>
                <a
                  href={`https://peaq.subscan.io/account/${pair.tokenBAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="token-link"
                >
                  <span className="amount">{formatTokenAmount(pair.reserves[1], pair.tokenBDecimals)}</span>
                  <span className="ticker">{pair.tokenBSymbol}</span>
                </a>
              </div>
            </td>
            <td data-label="Total LP Tokens" className="inline-cell">
              <div className="inline-cell-content">
                <span className="amount">{formatTokenAmount(pair.totalSupply, 18)}</span>
                <a
                  href={`https://peaq.subscan.io/account/${pair.pairAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="token-link"
                >
                  <span className="ticker">{`${pair.tokenASymbol}/${pair.tokenBSymbol}`}</span>
                </a>
              </div>
            </td>
            <td data-label="Total LP Tokens USD">{formatCurrency(pair.totalSupplyUSD)}</td>
            <td data-label="Your LP Balance" className="inline-cell">
              <div className="inline-cell-content">
                <span className="amount">{formatTokenAmount(pair.userBalance, 18)}</span>
                <a
                  href={`https://peaq.subscan.io/account/${pair.pairAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="token-link"
                >
                  <span className="ticker">{`${pair.tokenASymbol}/${pair.tokenBSymbol}`}</span>
                </a>
              </div>
            </td>
            <td data-label="Your LP Balance USD">{formatCurrency(pair.userBalanceUSD)}</td>
            <PercentageCell data-label="Your LP Share %" percentage={pair.userShare} forceGreen>
              {formatPercentage(pair.userShare)}
            </PercentageCell>
            <td data-label="Total LP Tokens Burned">{formatTokenAmount(pair.burnedBalance, 18)}</td>
            <PercentageCell data-label="% LP Burned" percentage={pair.burnedPercentage} forceGreen>
              {formatPercentage(pair.burnedPercentage)}
            </PercentageCell>
          </tr>
        ))}
      </tbody>
    </StyledTable>
  );
};

export default TokenPairsTable;

