import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'viem';
import {
  RemoveLiquidityButton,
  NoLiquidityMessage,
  LPTokenBalance,
  ErrorMessage,
  ExchangeRate,
} from '../../styles/RemoveLiquidityStyles';
import { executeContractWrite, ZERO_ADDRESS } from '../../lib/viemHelpers';
import { WRAPPED_PEAQ_ADDRESS } from '../../constants/contracts';
import { useAlerts } from '../../components/common/AlertProvider';
import { buildExplorerTxUrl } from '../../lib/explorer';

const RemoveLiquidityPEAQ = ({
  publicClient,
  walletClient,
  amountA,
  tokenA,
  tokenB,
  routerAddress,
  UniswapV2Router02ABI,
  UniswapV2PairABI,
  getPairAddress,
  getTokenAddress,
  account,
  tokens,
  exchangeRate,
  setNeedsApprovalLP,
  needsApprovalLP,
  setAllowanceLP,
  lpBalance,
  noLiquidity,
  error,
  handleBalanceClickIn
}) => {
  const { pushAlert } = useAlerts();
  const getDisplaySymbol = (tokenKey) => tokens[tokenKey]?.symbol || tokenKey;
  const [minimumTokenOut, setMinimumTokenOut] = useState(null);
  const [minimumPEAQOut, setMinimumPEAQOut] = useState(null);
  const [minimumAmountsRaw, setMinimumAmountsRaw] = useState({
    token: 0n,
    peaq: 0n,
  });
  const formatMinimumDisplay = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Awaiting Input...';
    }
    const numericValue = typeof value === 'string' ? Number(value) : Number(value);
    if (Number.isNaN(numericValue)) {
      return 'Awaiting Input...';
    }
    return numericValue.toFixed(6);
  };
  const hasValidPair = tokenA && tokenB && tokenA !== 'default' && tokenB !== 'default';
  const exchangeRateDisplay =
    hasValidPair && typeof exchangeRate === 'number' && Number.isFinite(exchangeRate)
      ? parseFloat(exchangeRate).toFixed(6)
      : null;

  const resolveTokenAddress = (symbol) => {
    if (!symbol || symbol === 'default') return null;
    if (symbol === 'PEAQ') return WRAPPED_PEAQ_ADDRESS;
    return getTokenAddress(symbol);
  };

  useEffect(() => {
    const calculateMinimumAmounts = async () => {
        if (
          !publicClient ||
          !amountA ||
          !tokenA ||
          !tokenB ||
          tokenA === 'default' ||
          tokenB === 'default'
        ) {
          return;
        }

        try {
          console.log("Starting calculateMinimumAmounts...");

          const pairAddress = await getPairAddress(tokenA, tokenB);
          if (!pairAddress || pairAddress === ZERO_ADDRESS) {
            console.error('Pair not found.');
            return;
          }

          const [reserves, totalSupply, token0] = await Promise.all([
            publicClient.readContract({
              address: pairAddress,
              abi: UniswapV2PairABI,
              functionName: 'getReserves',
            }),
            publicClient.readContract({
              address: pairAddress,
              abi: UniswapV2PairABI,
              functionName: 'totalSupply',
            }),
            publicClient.readContract({
              address: pairAddress,
              abi: UniswapV2PairABI,
              functionName: 'token0',
            }),
          ]);

          const addressA = resolveTokenAddress(tokenA);
          const addressB = resolveTokenAddress(tokenB);
          if (!addressA || !addressB) return;

          const reserveTokenA = addressA.toLowerCase() === token0.toLowerCase() ? reserves[0] : reserves[1];
          const reserveTokenB = addressA.toLowerCase() === token0.toLowerCase() ? reserves[1] : reserves[0];

          const tokenAIsPeaq = tokenA === 'PEAQ';
          if (!tokenAIsPeaq && tokenB !== 'PEAQ') {
            console.error('removeLiquidityPEAQ requires a PEAQ pair.');
            return;
          }

          const reservePeaq = tokenAIsPeaq ? reserveTokenA : reserveTokenB;
          const reserveNonPeaq = tokenAIsPeaq ? reserveTokenB : reserveTokenA;

          const liquidityToRemove = parseUnits(amountA.toString(), 18);
          const amountTokenMinRaw = (liquidityToRemove * reserveNonPeaq) / totalSupply;
          const amountPeaqMinRaw = (liquidityToRemove * reservePeaq) / totalSupply;
          const tokenDecimals = tokens[tokenA === 'PEAQ' ? tokenB : tokenA]?.decimals || 18;

          setMinimumTokenOut(formatUnits(amountTokenMinRaw, tokenDecimals));
          setMinimumPEAQOut(formatUnits(amountPeaqMinRaw, 18));
          setMinimumAmountsRaw({
            token: amountTokenMinRaw,
            peaq: amountPeaqMinRaw,
          });
        } catch (error) {
          console.error('Error calculating minimum amounts:', error);
        }
    };

    calculateMinimumAmounts();
}, [amountA, tokenA, tokenB, publicClient, UniswapV2PairABI, getPairAddress]);



  const handleApprove = async (tokenSymbolA, tokenSymbolB, amount) => {
    try {
      if (!walletClient || !publicClient || !account) {
        pushAlert({
          variant: 'error',
          message: 'Please connect your wallet to approve liquidity tokens.',
        });
        return;
      }
      const pairAddress = await getPairAddress(tokenSymbolA, tokenSymbolB);
      if (!pairAddress || pairAddress === ZERO_ADDRESS) throw new Error('Pair address not found');

      const amountParsed = parseUnits(amount.toString(), 18);
      console.log(`Approving ${amountParsed.toString()} of LP tokens for ${tokenSymbolA}-${tokenSymbolB}`);

      const receipt = await executeContractWrite({
        publicClient,
        walletClient,
        account,
        address: pairAddress,
        abi: UniswapV2PairABI,
        functionName: 'approve',
        args: [routerAddress, amountParsed],
      });

      setAllowanceLP(amountParsed);
      setNeedsApprovalLP(false);
      pushAlert({
        variant: 'approval',
        message: `${getDisplaySymbol(tokenSymbolA)}-${getDisplaySymbol(tokenSymbolB)} LP approval confirmed.`,
        link: buildExplorerTxUrl(receipt?.transactionHash),
        linkLabel: 'Approved',
      });
  } catch (err) {
      console.error('Error approving LP tokens:', err);
      pushAlert({
        variant: 'error',
        message: err?.message || 'Error approving LP tokens.',
      });
  }
};

  const handleRemoveLiquidity = async () => {
    if (error) {
      return;
    }

    try {
      if (!walletClient || !publicClient || !account) {
        pushAlert({
          variant: 'error',
          message: 'Please connect your wallet to remove liquidity.',
        });
        return;
      }
      console.log("Starting handleRemoveLiquidityPEAQ...");

      const liquidityToRemove = parseUnits(amountA.toString(), 18);
      console.log(`Parsed Liquidity to Remove: ${liquidityToRemove.toString()}`);

      const nonPeaqToken = tokenA === 'PEAQ' ? tokenB : tokenA;
      const tokenAddress = resolveTokenAddress(nonPeaqToken);
      if (!tokenAddress) {
        console.error('Token address not found for removeLiquidityETH');
        return;
      }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      const receipt = await executeContractWrite({
        publicClient,
        walletClient,
        account,
        address: routerAddress,
        abi: UniswapV2Router02ABI,
        functionName: 'removeLiquidityETH',
        args: [
          tokenAddress,
          liquidityToRemove,
          minimumAmountsRaw.token,
          minimumAmountsRaw.peaq,
          account,
          deadline,
        ],
      });

      pushAlert({
        variant: 'liquidityRemove',
        message: `${getDisplaySymbol(tokenA)}-${getDisplaySymbol(tokenB)} liquidity removed successfully.`,
        link: buildExplorerTxUrl(receipt?.transactionHash),
        linkLabel: 'Liquidity Removed',
      });
    } catch (err) {
      console.error('Error removing liquidity:', err);
      pushAlert({
        variant: 'error',
        message: err?.message || 'Error removing liquidity.',
      });
    }
  };


  const renderButton = () => {
    if (needsApprovalLP && tokenA) {
      console.log(`Needs approval for LP: ${tokenA} - ${tokenB} LP`);
      return (
        <RemoveLiquidityButton
          onClick={() => handleApprove(tokenA, tokenB, amountA)}
          disabled={!!error || !tokenA || !amountA || !walletClient}
        >
          Approve {tokens[tokenA]?.symbol} - {tokens[tokenB]?.symbol} LP
        </RemoveLiquidityButton>
      );
    }
    return (
      <RemoveLiquidityButton
        onClick={handleRemoveLiquidity}
        disabled={!!error || !tokenA || !tokenB || !amountA || !walletClient}
      >
        Remove Liquidity
      </RemoveLiquidityButton>
    );
  };

  return (
    <>
      {hasValidPair && (
        <>
          <LPTokenBalance>
            LP Balance:
            <a onClick={handleBalanceClickIn} id={`balance-${tokenA}-${tokenB}`}>
              <strong>{lpBalance}</strong>
            </a>
          </LPTokenBalance>
          <LPTokenBalance>
            <p>
              Minimum <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol} Received:
              {' '}
              {formatMinimumDisplay(tokenA === 'PEAQ' ? minimumPEAQOut : minimumTokenOut)}
              {' '}
              <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol}
            </p>
            <p>
              Minimum <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol} Received:
              {' '}
              {formatMinimumDisplay(tokenB === 'PEAQ' ? minimumPEAQOut : minimumTokenOut)}
              {' '}
              <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol}
            </p>
          </LPTokenBalance>
        </>
      )}
      {renderButton()}
      {hasValidPair && exchangeRateDisplay && (
        <ExchangeRate>
          Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol} = {exchangeRateDisplay}{' '}
          <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol}
        </ExchangeRate>
      )}
      {noLiquidity && (
        <NoLiquidityMessage>No Pair Found! Create your own</NoLiquidityMessage>
      )}
      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
    </>
  );
};

export default RemoveLiquidityPEAQ;
