import { useCallback } from 'react';

import { useTokens } from '../../contexts/TokenContext';
import { useWallet } from '../../contexts/WalletContext';
import {
  TableContainer,
  LoadingSpinner,
  EmptyState,
} from '../../styles/TokenBalancesStyles';
import MRBLLogo from '../../assets/MRBL_logo.png';
import useTokenBalancesData from './hooks/useTokenBalancesData';
import useTokenTableState from './hooks/useTokenTableState';
import TokenBalancesToolbar from './components/TokenBalancesToolbar';
import PortfolioStatsGrid from './components/PortfolioStatsGrid';
import TokenBalancesTable from './components/TokenBalancesTable';

const TokenBalances = () => {
  const { address, connect } = useWallet();
  const { tokens } = useTokens();

  const { loading, tokenData } = useTokenBalancesData({
    address,
    tokens,
  });

  const {
    sortConfig,
    handleSort,
    searchTerm,
    setSearchTerm,
    showHoldingsOnly,
    toggleHoldingsFilter,
    filteredTokenData,
    portfolioStats,
  } = useTokenTableState(tokenData);

  const handleLogoClick = useCallback(
    async (token) => {
      if (typeof window === 'undefined') return;
      if (!window.ethereum) {
        window.alert('Please install a Web3 wallet to add tokens.');
        return;
      }

      if (!address) {
        try {
          await connect();
        } catch (error) {
          console.error('Wallet connection request rejected', error);
          return;
        }
      }

      if (!token.tokenAddress) {
        window.alert('This token cannot be added automatically yet.');
        return;
      }

      try {
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: token.tokenAddress,
              symbol: token.symbol,
              decimals: token.decimals ?? 18,
              image: token.logo,
            },
          },
        });
      } catch (error) {
        if (error?.code === 4001) return;
        console.error('Failed to add token to wallet', error);
      }
    },
    [address, connect],
  );

  return (
    <TableContainer>
      {loading ? (
        <LoadingSpinner>
          <img src={MRBLLogo} alt="Loading" />
          <p>Fetching your Marbles...</p>
        </LoadingSpinner>
      ) : (
        <>
          <TokenBalancesToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showHoldingsOnly={showHoldingsOnly}
            onToggleHoldings={toggleHoldingsFilter}
          />

          <PortfolioStatsGrid stats={portfolioStats} />

          {filteredTokenData.length === 0 ? (
            <EmptyState>
              No tokens match your filters yet. Try clearing the search or showing all tokens.
            </EmptyState>
          ) : (
            <TokenBalancesTable
              tokens={filteredTokenData}
              sortConfig={sortConfig}
              onSort={handleSort}
              onLogoClick={handleLogoClick}
            />
          )}
        </>
      )}
    </TableContainer>
  );
};

export default TokenBalances;
