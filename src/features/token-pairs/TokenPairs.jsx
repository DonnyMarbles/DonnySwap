import { useMemo, useState } from 'react';
import { useTokens } from '../../contexts/TokenContext';
import { useABI } from '../../contexts/ABIContext';
import { usePEAQPrice } from '../../contexts/PEAQPriceContext';
import { TableContainer, LoadingSpinner, EmptyState } from '../../styles/TokenPairsStyles';
import { useWallet } from '../../contexts/WalletContext';
import MRBLLogo from '../../assets/MRBL_logo.png';
import TokenPairsTable from './components/TokenPairsTable';
import TokenPairsToolbar from './components/TokenPairsToolbar';
import useBlockNumberPolling from '../../hooks/useBlockNumberPolling';
import useTokenPairsData from './hooks/useTokenPairsData';

const TokenPairs = () => {
  const { publicClient, address: account } = useWallet();
  const { tokens } = useTokens();
  const { UniswapV2PairABI, UniswapV2FactoryABI } = useABI();
  const { PEAQPrice } = usePEAQPrice();
  const [searchTerm, setSearchTerm] = useState('');
  const [showHoldingsOnly, setShowHoldingsOnly] = useState(false);

  const blockNumber = useBlockNumberPolling(publicClient);

  const { pairs, loading } = useTokenPairsData({
    publicClient,
    tokens,
    abis: { UniswapV2PairABI, UniswapV2FactoryABI },
    account,
    PEAQPrice,
    blockNumber,
  });

  const filteredPairs = useMemo(() => {
    if (!pairs?.length) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return pairs.filter((pair) => {
      const tokenALower = pair.tokenASymbol?.toLowerCase() || '';
      const tokenBLower = pair.tokenBSymbol?.toLowerCase() || '';
      const pairSymbol = `${tokenALower}/${tokenBLower}`;
      const reversedPairSymbol = `${tokenBLower}/${tokenALower}`;
      const matchesSearch =
        !normalizedSearch ||
        tokenALower.includes(normalizedSearch) ||
        tokenBLower.includes(normalizedSearch) ||
        pairSymbol.includes(normalizedSearch) ||
        reversedPairSymbol.includes(normalizedSearch);

      const hasHoldings =
        typeof pair.userBalance === 'bigint' ? pair.userBalance > 0n : Number(pair.userBalance || 0) > 0;
      const matchesHoldingsFilter = !showHoldingsOnly || hasHoldings;

      return matchesSearch && matchesHoldingsFilter;
    });
  }, [pairs, searchTerm, showHoldingsOnly]);

  const portfolioStats = useMemo(() => {
    if (!filteredPairs.length) {
      return {
        totalUsd: 0,
        activePools: 0,
        shownPools: 0,
        topPosition: null,
      };
    }

    let totalUsd = 0;
    let activePools = 0;
    let topPosition = null;

    filteredPairs.forEach((pair) => {
      const usdValue = Number(pair.userBalanceUSD || 0);
      const isValidUsd = Number.isFinite(usdValue) ? usdValue : 0;
      totalUsd += isValidUsd;

      const hasHoldings =
        typeof pair.userBalance === 'bigint'
          ? pair.userBalance > 0n
          : Number(pair.userBalance || 0) > 0;

      if (hasHoldings) {
        activePools += 1;
        if (!topPosition || isValidUsd > topPosition.usdValue) {
          topPosition = {
            label: `${pair.tokenASymbol}/${pair.tokenBSymbol}`,
            usdValue: isValidUsd,
          };
        }
      }
    });

    return {
      totalUsd,
      activePools,
      shownPools: filteredPairs.length,
      topPosition,
    };
  }, [filteredPairs]);

  const handleToggleHoldings = () => setShowHoldingsOnly((prev) => !prev);

  return (
    <TableContainer>
      {loading ? (
        <LoadingSpinner>
          <img src={MRBLLogo} alt="Loading" />
          <p>Fetching your Marbles...</p>
        </LoadingSpinner>
      ) : (
        <>
          <TokenPairsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showHoldingsOnly={showHoldingsOnly}
            onToggleHoldings={handleToggleHoldings}
            portfolioStats={portfolioStats}
          />
          {filteredPairs.length === 0 ? (
            <EmptyState>
              {pairs.length === 0
                ? 'No token pairs are available yet. Try reconnecting your wallet or refreshing.'
                : 'No token pairs match your filters yet. Try clearing the search or showing all pairs.'}
            </EmptyState>
          ) : (
            <TokenPairsTable pairs={filteredPairs} />
          )}
        </>
      )}
    </TableContainer>
  );
};

export default TokenPairs;
