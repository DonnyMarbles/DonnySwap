import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { formatUnits, getAddress } from 'viem';
import axios from 'axios';
import { useTokens } from '../../contexts/TokenContext';
import { useABI } from '../../contexts/ABIContext';
import { usePEAQPrice } from '../../contexts/PEAQPriceContext';
import { apiUrl } from '../../constants/api';
import { WRAPPED_PEAQ_ADDRESS, DSFO_NFT_ADDRESS, FEE_MANAGER_ADDRESS } from '../../constants/contracts';
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
import { executeContractWrite } from '../../lib/viemHelpers';

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
  const { UniswapV2PairABI, DSFONFTv3ABI, FeeManagerV2ABI } = useABI();
  const { address: userAddress, publicClient, walletClient } = useWallet();
  const { PEAQPrice } = usePEAQPrice();
  const { tokenPairs } = useTokenPairsCtx();

  // Raw aggregated fees from API: { symbol: amount }
  const [dexFees, setDexFees] = useState({});
  // On-chain claimable fees: { tokenAddress: { symbol, amount, decimals } }
  const [claimableFees, setClaimableFees] = useState([]);
  // Token USD prices: { symbol: usdPricePerToken }
  const [tokenPrices, setTokenPrices] = useState({});

  const [dexFeesLoaded, setDexFeesLoaded] = useState(false);
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  const [dsfoNFTCount, setDsfoNFTCount] = useState(0);
  const [activeSupply, setActiveSupply] = useState(0);
  const [ownershipPercentage, setOwnershipPercentage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEarningsOnly, setShowEarningsOnly] = useState(false);

  const priceComputeRef = useRef(false);
  const loading = !dexFeesLoaded || !pricesLoaded;

  // Build user fees from on-chain claimable data
  const userFees = useMemo(() => {
    const fees = {};
    for (const entry of claimableFees) {
      if (entry.amount > 0) {
        fees[entry.symbol] = parseFloat(formatUnits(entry.amount, entry.decimals));
      }
    }
    return fees;
  }, [claimableFees]);

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
  const hasClaimable = claimableFees.some((f) => f.amount > 0n);

  // ── Claim all fees on-chain ──
  const handleClaimAll = async () => {
    if (!walletClient || !publicClient || !userAddress) return;
    setClaimLoading(true);
    setErrorMessage('');
    try {
      await executeContractWrite({
        publicClient,
        walletClient,
        account: userAddress,
        address: getAddress(FEE_MANAGER_ADDRESS),
        abi: FeeManagerV2ABI,
        functionName: 'claimAllFees',
      });
      // Refresh claimable after claim
      await fetchClaimable();
    } catch (error) {
      console.error('Claim error:', error);
      setErrorMessage(error.message || 'An error occurred claiming fees.');
    } finally {
      setClaimLoading(false);
    }
  };

  // ── Fetch on-chain claimable fees ──
  const fetchClaimable = useCallback(async () => {
    if (!userAddress || !publicClient || !FeeManagerV2ABI) return;
    try {
      const fmAddress = getAddress(FEE_MANAGER_ADDRESS);
      const [tokenAddresses, amounts] = await publicClient.readContract({
        address: fmAddress,
        abi: FeeManagerV2ABI,
        functionName: 'claimableAll',
        args: [userAddress],
      });

      const entries = await Promise.all(
        tokenAddresses.map(async (addr, i) => {
          try {
            const [symbol, decimals] = await Promise.all([
              publicClient.readContract({ address: addr, abi: [{ type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' }], functionName: 'symbol' }),
              publicClient.readContract({ address: addr, abi: [{ type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' }], functionName: 'decimals' }),
            ]);
            return { address: addr, symbol, decimals: Number(decimals), amount: amounts[i] };
          } catch {
            return { address: addr, symbol: 'UNKNOWN', decimals: 18, amount: amounts[i] };
          }
        })
      );

      setClaimableFees(entries);
    } catch (error) {
      console.error('Error fetching claimable fees:', error);
    }
  }, [userAddress, publicClient, FeeManagerV2ABI]);

  useEffect(() => {
    fetchClaimable();
  }, [fetchClaimable]);

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

  // ── Compute token USD prices ──
  const computeTokenPrices = useCallback(async () => {
    if (!tokens || !Object.keys(tokens).length || !tokenPairs || !PEAQPrice || !publicClient || !UniswapV2PairABI) return;

    const allSymbols = new Set([...Object.keys(dexFees), ...Object.keys(userFees)]);
    if (allSymbols.size === 0) { setPricesLoaded(true); return; }

    const prices = {};
    if (allSymbols.has('PEAQ')) { prices.PEAQ = PEAQPrice; allSymbols.delete('PEAQ'); }
    if (allSymbols.has('WPEAQ')) { prices.WPEAQ = PEAQPrice; allSymbols.delete('WPEAQ'); }

    const pairLookups = [];
    for (const symbol of allSymbols) {
      const tokenData = Object.values(tokens).find((t) => t.symbol === symbol);
      if (!tokenData) continue;
      for (const pairAddress in tokenPairs) {
        const pair = tokenPairs[pairAddress];
        if (pair.token1_address === tokenData.address || pair.token2_address === tokenData.address) {
          pairLookups.push({ symbol, tokenData, pairAddress: getAddress(pairAddress), pair });
          break;
        }
      }
    }

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
          prices[symbol] = reserveToken > 0 ? (reserveWPEAQ / reserveToken) * PEAQPrice : 0;
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
    if (priceComputeRef.current) return;
    priceComputeRef.current = true;
    computeTokenPrices().finally(() => { priceComputeRef.current = false; });
  }, [dexFeesLoaded, computeTokenPrices]);

  // ── Fetch NFT ownership (v3: activeSupply) ──
  useEffect(() => {
    if (!userAddress || !publicClient || !DSFONFTv3ABI) return;
    let cancelled = false;

    const fetchNFTData = async () => {
      try {
        const dsfoContract = { address: getAddress(DSFO_NFT_ADDRESS), abi: DSFONFTv3ABI };
        const [nftCount, supply] = await Promise.all([
          publicClient.readContract({ ...dsfoContract, functionName: 'balanceOf', args: [userAddress] }),
          publicClient.readContract({ ...dsfoContract, functionName: 'activeSupply' }),
        ]);

        if (cancelled) return;
        setDsfoNFTCount(Number(nftCount));
        setActiveSupply(Number(supply));
        const pct = supply === 0n ? 0 : (Number(nftCount) / Number(supply)) * 100;
        setOwnershipPercentage(pct.toFixed(2));
      } catch (error) {
        console.error('Error fetching NFT data:', error);
      }
    };

    fetchNFTData();
    return () => { cancelled = true; };
  }, [userAddress, publicClient, DSFONFTv3ABI]);

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
                <h4>Claimable (USD)</h4>
                <p>{formatCurrency(toolbarStats.userUsd)}</p>
                <span>{`${toolbarStats.earningTokens} earning tokens`}</span>
              </ToolbarStatCard>
              <ToolbarStatCard>
                <h4>Top Earning Token</h4>
                <p>{toolbarStats.topToken ? toolbarStats.topToken.symbol : '\u2014'}</p>
                <span>
                  {toolbarStats.topToken
                    ? formatCurrency(toolbarStats.topToken.userUsd)
                    : 'No earnings yet'}
                </span>
              </ToolbarStatCard>
              <ToolbarStatCard>
                <h4>DSFO NFTs</h4>
                <p>{dsfoNFTCount}</p>
                <span>{activeSupply} active supply</span>
              </ToolbarStatCard>
              <ToolbarStatCard>
                <h4>DEX Ownership</h4>
                <p>{ownershipDisplay}</p>
                <span>Share via DSFO NFTs</span>
              </ToolbarStatCard>
            </ToolbarStatsGrid>
            {hasClaimable && userAddress && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                  onClick={handleClaimAll}
                  disabled={claimLoading || !walletClient}
                  style={{
                    padding: '10px 24px',
                    background: '#dbaa65',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1em',
                  }}
                >
                  {claimLoading ? 'Claiming...' : 'Claim All Fees'}
                </button>
              </div>
            )}
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
                    <TableHead>Your Claimable Fees</TableHead>
                    <TableHead>Your Fees in USD</TableHead>
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
                      <TableCell data-label="Your Claimable Fees">
                        {row.logo && <img src={row.logo} alt={`${row.symbol} logo`} />}
                        {formatTokenAmount(row.userAmount)} <b>{row.symbol}</b>
                      </TableCell>
                      <TableCell data-label="Your Fees in USD">
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
