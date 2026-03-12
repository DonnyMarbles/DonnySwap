import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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

const WPEAQ_ADDRESS = getAddress(WRAPPED_PEAQ_ADDRESS);

const FeesDashboard = () => {
  const { tokens } = useTokens();
  const { UniswapV2PairABI, DSFONFTABI } = useABI();
  const { address: userAddress, publicClient } = useWallet();
  const { PEAQPrice } = usePEAQPrice();
  const { tokenPairs } = useTokenPairsCtx();

  // Raw aggregated fees from API: { symbol: amount }
  const [dexFees, setDexFees] = useState({});
  const [userFees, setUserFees] = useState({});
  // Token USD prices (computed once, shared): { symbol: usdPricePerToken }
  const [tokenPrices, setTokenPrices] = useState({});

  const [dexFeesLoaded, setDexFeesLoaded] = useState(false);
  const [userFeesLoaded, setUserFeesLoaded] = useState(false);
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [dsfoNFTCount, setDsfoNFTCount] = useState(0);
  const [ownershipPercentage, setOwnershipPercentage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEarningsOnly, setShowEarningsOnly] = useState(false);

  const priceComputeRef = useRef(false);

  // Derive loading: show spinner until DEX fees + prices are ready
  // (user fees are optional — only if wallet connected)
  const loading = !dexFeesLoaded || !pricesLoaded;

  // Build rows from aggregated data + shared price map
  const feeRows = useMemo(() => {
    const allSymbols = new Set([
      ...Object.keys(dexFees),
      ...Object.keys(userFees),
    ]);

    return Array.from(allSymbols)
      .map((symbol) => {
        const dexAmount = safeNumber(dexFees[symbol]);
        const userAmount = safeNumber(userFees[symbol]);
        const pricePerToken = safeNumber(tokenPrices[symbol]);

        const tokenData = Object.values(tokens).find((t) => t.symbol === symbol);
        const logo = tokenData ? tokens[tokenData.address]?.logo || '' : '';

        return {
          symbol,
          logo,
          dexAmount,
          dexUsd: dexAmount * pricePerToken,
          userAmount,
          userUsd: userAmount * pricePerToken,
        };
      })
      .sort((a, b) => b.dexUsd - a.dexUsd);
  }, [dexFees, userFees, tokenPrices, tokens]);

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

  // ── Fetch DEX-wide aggregated fees ──
  useEffect(() => {
    let cancelled = false;

    const fetchDexFees = async () => {
      try {
        const response = await axios.get(apiUrl('getAggregatedFeesPEAQ'));
        if (cancelled) return;

        const aggregated = {};
        (response.data || []).forEach((row) => {
          aggregated[row.token_symbol] = parseFloat(row.total_amount);
        });
        setDexFees(aggregated);
      } catch (err) {
        console.error('Error fetching aggregated DEX fees:', err);
        if (!cancelled) setErrorMessage('Error fetching fees data.');
      } finally {
        if (!cancelled) setDexFeesLoaded(true);
      }
    };

    fetchDexFees();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch user-specific aggregated fees ──
  useEffect(() => {
    if (!userAddress) {
      setUserFees({});
      setUserFeesLoaded(true);
      return;
    }

    let cancelled = false;

    const fetchUserFees = async () => {
      try {
        const response = await axios.get(apiUrl(`getAggregatedFeesPEAQ/${userAddress}`));
        if (cancelled) return;

        const aggregated = {};
        (response.data || []).forEach((row) => {
          aggregated[row.token_symbol] = parseFloat(row.total_amount);
        });
        setUserFees(aggregated);
      } catch (err) {
        console.error('Error fetching user fees:', err);
        if (!cancelled) setErrorMessage('Error fetching fees data.');
      } finally {
        if (!cancelled) setUserFeesLoaded(true);
      }
    };

    fetchUserFees();
    return () => { cancelled = true; };
  }, [userAddress]);

  // ── Compute token→USD prices once (shared for both DEX and user) ──
  const computeTokenPrices = useCallback(async () => {
    if (!tokens || !Object.keys(tokens).length || !tokenPairs || !PEAQPrice || !publicClient || !UniswapV2PairABI) {
      return;
    }

    // Gather all unique symbols that need pricing
    const allSymbols = new Set([...Object.keys(dexFees), ...Object.keys(userFees)]);
    if (allSymbols.size === 0) {
      setPricesLoaded(true);
      return;
    }

    const prices = {};

    // PEAQ and WPEAQ are priced directly
    if (allSymbols.has('PEAQ')) {
      prices.PEAQ = PEAQPrice;
      allSymbols.delete('PEAQ');
    }
    if (allSymbols.has('WPEAQ')) {
      prices.WPEAQ = PEAQPrice;
      allSymbols.delete('WPEAQ');
    }

    // For remaining tokens, find their pair with WPEAQ and batch-fetch reserves
    const pairLookups = [];
    for (const symbol of allSymbols) {
      const tokenData = Object.values(tokens).find((t) => t.symbol === symbol);
      if (!tokenData) continue;

      for (const pairAddress in tokenPairs) {
        const pair = tokenPairs[pairAddress];
        if (pair.token1_address === tokenData.address || pair.token2_address === tokenData.address) {
          pairLookups.push({
            symbol,
            tokenData,
            pairAddress: getAddress(pairAddress),
            pair,
          });
          break;
        }
      }
    }

    // Batch all getReserves calls in parallel
    if (pairLookups.length > 0) {
      try {
        const reserveResults = await Promise.all(
          pairLookups.map((lookup) =>
            publicClient.readContract({
              address: lookup.pairAddress,
              abi: UniswapV2PairABI,
              functionName: 'getReserves',
            })
          )
        );

        reserveResults.forEach(([reserve0, reserve1], index) => {
          const { symbol, tokenData, pair } = pairLookups[index];
          let reserveWPEAQ, reserveToken;

          if (getAddress(pair.token1_address) === WPEAQ_ADDRESS) {
            reserveWPEAQ = parseFloat(formatUnits(reserve0, 18));
            reserveToken = parseFloat(formatUnits(reserve1, tokenData.decimals));
          } else {
            reserveWPEAQ = parseFloat(formatUnits(reserve1, 18));
            reserveToken = parseFloat(formatUnits(reserve0, tokenData.decimals));
          }

          if (reserveToken > 0) {
            const priceInWPEAQ = reserveWPEAQ / reserveToken;
            prices[symbol] = priceInWPEAQ * PEAQPrice;
          } else {
            prices[symbol] = 0;
          }
        });
      } catch (err) {
        console.error('Error batch-fetching reserves for USD pricing:', err);
      }
    }

    setTokenPrices(prices);
    setPricesLoaded(true);
  }, [tokens, tokenPairs, PEAQPrice, publicClient, UniswapV2PairABI, dexFees, userFees]);

  useEffect(() => {
    if (!dexFeesLoaded) return;

    // Only compute once per data change
    if (priceComputeRef.current) return;
    priceComputeRef.current = true;

    computeTokenPrices().finally(() => {
      priceComputeRef.current = false;
    });
  }, [dexFeesLoaded, computeTokenPrices]);

  // ── Fetch NFT ownership data ──
  useEffect(() => {
    if (!userAddress || !publicClient || !DSFONFTABI) return;
    let cancelled = false;

    const fetchNFTData = async () => {
      try {
        const dsfoContract = { address: getAddress(DSFO_NFT_ADDRESS), abi: DSFONFTABI };
        const [nftCount, totalSupply] = await Promise.all([
          publicClient.readContract({
            ...dsfoContract,
            functionName: 'balanceOf',
            args: [userAddress],
          }),
          publicClient.readContract({
            ...dsfoContract,
            functionName: 'totalSupply',
          }),
        ]);

        if (cancelled) return;
        setDsfoNFTCount(Number(nftCount));
        const ownershipPct =
          totalSupply === 0n ? 0 : (Number(nftCount) / Number(totalSupply)) * 100;
        setOwnershipPercentage(ownershipPct.toFixed(2));
      } catch (error) {
        console.error('Error fetching NFT data:', error);
      }
    };

    fetchNFTData();
    return () => { cancelled = true; };
  }, [userAddress, publicClient, DSFONFTABI]);

  return (
    <DashboardContainer>
      {loading ? (
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
