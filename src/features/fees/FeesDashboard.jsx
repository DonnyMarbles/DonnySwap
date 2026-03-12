import { useEffect, useState, useMemo } from 'react';
import { formatUnits, getAddress } from 'viem';
import axios from 'axios';
import { useTokens } from '../../contexts/TokenContext';
import { useABI } from '../../contexts/ABIContext';
import { usePEAQPrice } from '../../contexts/PEAQPriceContext';
import { apiUrl } from '../../constants/api';
import { WRAPPED_PEAQ_ADDRESS, DSFO_NFT_ADDRESS } from '../../constants/contracts';
import {
  DashboardContainer,
  Table,
  TableWrapper,
  TableRow,
  TableCell,
  LoadingSpinner,
  ErrorMessage,
  TableHead,
} from '../../styles/FeesDashboardStyles';
import { useTokenPairsCtx } from '../../contexts/TokenPairsContext';
import { useWallet } from '../../contexts/WalletContext';
import MRBLLogo from '../../assets/MRBL_logo.png';
import {
  Toolbar,
  ToolbarControls,
  SearchInput,
  ToggleGroup,
  ToggleButton,
  ToolbarStatsGrid,
  ToolbarStatCard,
} from '../../styles/TokenPairsStyles';
import { formatCurrency } from '../../lib/formatters';

const safeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatTokenAmount = (value) =>
  safeNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });

const formatUsdWithFloor = (value) => {
  const numeric = safeNumber(value);
  if (numeric !== 0 && Math.abs(numeric) < 0.01) {
    return '<$0.01';
  }
  return formatCurrency(numeric);
};

const FeesDashboard = () => {
  const { tokens } = useTokens();
  const { UniswapV2PairABI, DSFONFTABI } = useABI();
  const { address: userAddress, publicClient } = useWallet();
  const { PEAQPrice } = usePEAQPrice();
  const { tokenPairs } = useTokenPairsCtx();
  const [totalFees, setTotalFees] = useState({});
  const [userFees, setUserFees] = useState({});
  const [usdFees, setUsdFees] = useState({});
  const [dexOverallUsdFees, setDexOverallUsdFees] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dsfoNFTCount, setDsfoNFTCount] = useState(0);
  const [ownershipPercentage, setOwnershipPercentage] = useState(0);
  const [calculationsDone, setCalculationsDone] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEarningsOnly, setShowEarningsOnly] = useState(false);

  const DSFOContractAddress = getAddress(DSFO_NFT_ADDRESS);
  const WPEAQ_ADDRESS = getAddress(WRAPPED_PEAQ_ADDRESS);

  const feeRows = useMemo(() => {
    const symbols = new Set([
      ...Object.keys(totalFees || {}),
      ...Object.keys(dexOverallUsdFees || {}),
      ...Object.keys(usdFees || {}),
    ]);

    return Array.from(symbols)
      .map((symbol) => {
        const dexData = (dexOverallUsdFees && dexOverallUsdFees[symbol]) || {};
        const userData = (usdFees && usdFees[symbol]) || {};

        return {
          symbol,
          logo: dexData.logo || userData.logo || '',
          dexAmount: safeNumber(dexData.amount ?? totalFees?.[symbol]),
          dexUsd: safeNumber(dexData.usd),
          userAmount: safeNumber(userData.amount ?? userFees?.[symbol]),
          userUsd: safeNumber(userData.usd),
        };
      })
      .sort((a, b) => b.dexUsd - a.dexUsd);
  }, [totalFees, dexOverallUsdFees, usdFees, userFees]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return feeRows.filter((row) => {
      const matchesSearch = !normalizedSearch || row.symbol.toLowerCase().includes(normalizedSearch);
      const hasEarnings = row.userAmount > 0;
      return matchesSearch && (!showEarningsOnly || hasEarnings);
    });
  }, [feeRows, searchTerm, showEarningsOnly]);

  const toolbarStats = useMemo(
    () =>
      filteredRows.reduce(
        (stats, row) => {
          stats.dexUsd += row.dexUsd;
          stats.userUsd += row.userUsd;
          stats.shownTokens += 1;
          if (row.userAmount > 0) {
            stats.earningTokens += 1;
            if (!stats.topToken || row.userUsd > stats.topToken.userUsd) {
              stats.topToken = row;
            }
          }
          return stats;
        },
        { dexUsd: 0, userUsd: 0, shownTokens: 0, earningTokens: 0, topToken: null },
      ),
    [filteredRows],
  );

  const handleToggleEarningsFilter = () => setShowEarningsOnly((prev) => !prev);
  const hasAnyRows = feeRows.length > 0;
  const ownershipDisplay = `${safeNumber(ownershipPercentage).toFixed(2)}%`;

  // Fetch NFT Data
  useEffect(() => {
    const fetchNFTData = async () => {
      try {
        if (!userAddress || !publicClient) return;

        const dsfoContract = { address: DSFOContractAddress, abi: DSFONFTABI };
        const nftCount = await publicClient.readContract({
          ...dsfoContract,
          functionName: 'balanceOf',
          args: [userAddress],
        });
        const totalSupply = await publicClient.readContract({
          ...dsfoContract,
          functionName: 'totalSupply',
        });
        setDsfoNFTCount(Number(nftCount));
        const ownershipPct =
          totalSupply === 0n ? 0 : (Number(nftCount) / Number(totalSupply)) * 100;
        setOwnershipPercentage(ownershipPct.toFixed(2));
      } catch (error) {
        console.error('Error fetching NFT data:', error);
      }
    };

    if (userAddress && publicClient) {
      fetchNFTData();
    }
  }, [userAddress, publicClient, DSFONFTABI]);

  // Fetch All Fees Data from API (for all users)
  useEffect(() => {
    const fetchAllFees = async () => {
      try {
        const response = await axios.get(apiUrl('getAllFeesPEAQ'));
        const allFees = response.data;

        let accumulatedTotalFees = {};

        // Accumulate fees per token for all users by token symbol
        allFees.forEach((fee) => {
          const tokenSymbol = fee.token_symbol;

          if (!accumulatedTotalFees[tokenSymbol]) {
            accumulatedTotalFees[tokenSymbol] = parseFloat(fee.fees_amount);
          } else {
            accumulatedTotalFees[tokenSymbol] += parseFloat(fee.fees_amount);
          }
        });

        setTotalFees(accumulatedTotalFees);
      } catch (error) {
        console.error('Error fetching all fees data:', error);
      }
    };

    fetchAllFees();
  }, []);

  // Fetch User-Specific Fees from API
  useEffect(() => {
    const fetchUserFees = async () => {
      try {
        if (!userAddress || !publicClient) return;

        const response = await axios.get(apiUrl(`getFeesPEAQ/${userAddress}`));
        const userFeesData = response.data;

        let accumulatedUserFees = {};

        // Accumulate fees per token for the specific user by token symbol
        userFeesData.forEach((fee) => {
          const tokenSymbol = fee.token_symbol;

          if (!accumulatedUserFees[tokenSymbol]) {
            accumulatedUserFees[tokenSymbol] = parseFloat(fee.fees_amount);
          } else {
            accumulatedUserFees[tokenSymbol] += parseFloat(fee.fees_amount);
          }
        });

        setUserFees(accumulatedUserFees);
      } catch (error) {
        console.error('Error fetching user fees data:', error);
        setErrorMessage('Error fetching fees data.');
        setLoading(false);
      }
    };

    if (userAddress && publicClient) {
      fetchUserFees();
    }
  }, [publicClient, userAddress]);

  const calculateUsdFees = async (feesBySymbol) => {
    if (!tokens || !Object.keys(tokens).length || !tokenPairs || !PEAQPrice) {
      return {};
    }

    const result = {};

    for (const [symbol, amount] of Object.entries(feesBySymbol)) {
      if (symbol === 'PEAQ') continue;

      const tokenData = Object.values(tokens).find(token => token.symbol === symbol);
      if (!tokenData) continue;

      let usdValue = 0;

      if (symbol === 'WPEAQ') {
        usdValue = amount * PEAQPrice;
      } else {
        for (const pairAddress in tokenPairs) {
          const pair = tokenPairs[pairAddress];

          if (
            pair.token1_address === tokenData.address ||
            pair.token2_address === tokenData.address
          ) {
            const pairContract = { address: getAddress(pairAddress), abi: UniswapV2PairABI };
            const [reserve0, reserve1] = await publicClient.readContract({
              ...pairContract,
              functionName: 'getReserves',
            });

            let reserveWPEAQ, reserveToken;

            if (getAddress(pair.token1_address) === WPEAQ_ADDRESS) {
              reserveWPEAQ = parseFloat(formatUnits(reserve0, 18));
              reserveToken = parseFloat(formatUnits(reserve1, tokenData.decimals));
            } else {
              reserveWPEAQ = parseFloat(formatUnits(reserve1, 18));
              reserveToken = parseFloat(formatUnits(reserve0, tokenData.decimals));
            }

            const priceOfTokenInWPEAQ = reserveToken / reserveWPEAQ;
            usdValue = priceOfTokenInWPEAQ * PEAQPrice * amount;
            break;
          }
        }
      }

      result[symbol] = {
        amount: amount.toFixed(6),
        usd: usdValue.toFixed(2),
        logo: tokens[tokenData.address]?.logo || '',
      };
    }

    return result;
  };

  useEffect(() => {
    if (Object.keys(totalFees).length > 0) {
      calculateUsdFees(totalFees).then(setDexOverallUsdFees);
    }
  }, [totalFees, tokens, tokenPairs, PEAQPrice, publicClient, UniswapV2PairABI, WPEAQ_ADDRESS]);

  useEffect(() => {
    if (Object.keys(userFees).length > 0) {
      calculateUsdFees(userFees).then((result) => {
        setUsdFees(result);
        setCalculationsDone(true);
        setLoading(false);
      });
    }
  }, [userFees, tokens, tokenPairs, PEAQPrice, publicClient, UniswapV2PairABI, WPEAQ_ADDRESS]);

  return (
    <DashboardContainer>
      {loading || !calculationsDone ? (
        <LoadingSpinner>
          <img src={MRBLLogo} alt="Loading" />
          <p>Fetching your Marbles...</p>
        </LoadingSpinner>
      ) : errorMessage ? (
        <ErrorMessage>{errorMessage}</ErrorMessage>
      ) : (
        <>
          <Toolbar>
            <ToolbarControls>
              <SearchInput
                type="search"
                placeholder="Search token symbol..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search fees by token symbol"
              />
              <ToggleGroup>
                <ToggleButton
                  type="button"
                  aria-pressed={showEarningsOnly}
                  onClick={handleToggleEarningsFilter}
                >
                  {showEarningsOnly ? 'Showing earnings' : 'Show earnings only'}
                </ToggleButton>
              </ToggleGroup>
            </ToolbarControls>
            <ToolbarStatsGrid>
              <ToolbarStatCard>
                <h4>DEX Fees (USD)</h4>
                <p>{formatCurrency(toolbarStats.dexUsd)}</p>
                <span>Across shown tokens</span>
              </ToolbarStatCard>
              <ToolbarStatCard>
                <h4>Your Fees (USD)</h4>
                <p>{formatCurrency(toolbarStats.userUsd)}</p>
                <span>{`${toolbarStats.earningTokens} earning tokens`}</span>
              </ToolbarStatCard>
              <ToolbarStatCard>
                <h4>Top Earning Token</h4>
                <p>{toolbarStats.topToken ? toolbarStats.topToken.symbol : '—'}</p>
                <span>
                  {toolbarStats.topToken
                    ? formatCurrency(toolbarStats.topToken.userUsd)
                    : 'No earnings yet'}
                </span>
              </ToolbarStatCard>
              <ToolbarStatCard>
                <h4>DSFO NFTs</h4>
                <p>{dsfoNFTCount}</p>
                <span>Owned tokens</span>
              </ToolbarStatCard>
              <ToolbarStatCard>
                <h4>DEX Ownership</h4>
                <p>{ownershipDisplay}</p>
                <span>Share via DSFO NFTs</span>
              </ToolbarStatCard>
            </ToolbarStatsGrid>
            <br />
          </Toolbar>
          {!hasAnyRows ? (
            <ErrorMessage>No fees data available to display.</ErrorMessage>
          ) : filteredRows.length === 0 ? (
            <ErrorMessage>
              No fees match your filters yet. Try clearing the search or showing all tokens.
            </ErrorMessage>
          ) : (
            <TableWrapper>
              <Table>
                <thead>
                  <TableRow>
                    <TableHead>Total DEX Fees Overall</TableHead>
                    <TableHead>Total DEX Fees in USD</TableHead>
                    <TableHead>Your Total Fees Earned</TableHead>
                    <TableHead>Your Fees Earned in USD</TableHead>
                  </TableRow>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.symbol}>
                      <TableCell data-label="Total DEX Fees Overall">
                        {row.logo && <img src={row.logo} alt={`${row.symbol} logo`} />}
                        {formatTokenAmount(row.dexAmount)} <b>{row.symbol}</b>
                      </TableCell>
                      <TableCell data-label="Total DEX Fees in USD">
                        {formatUsdWithFloor(row.dexUsd)}
                      </TableCell>
                      <TableCell data-label="Your Total Fees Earned">
                        {row.logo && <img src={row.logo} alt={`${row.symbol} logo`} />}
                        {formatTokenAmount(row.userAmount)} <b>{row.symbol}</b>
                      </TableCell>
                      <TableCell data-label="Your Fees Earned in USD">
                        {formatUsdWithFloor(row.userUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          )}
        </>
      )}
    </DashboardContainer>
  );
};

export default FeesDashboard;
