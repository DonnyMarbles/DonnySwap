import { useEffect, useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { SwapButton, ExchangeRate, GreyedOutUSD } from '../../styles/SwapStyles';
import { executeContractWrite } from '../../lib/viemHelpers';
import { useAlerts } from '../../components/common/AlertProvider';
import { buildExplorerTxUrl } from '../../lib/explorer';
import { calculatePriceImpact, getPriceImpactColor, extractReceivedAmount } from '../../lib/tokenMath';

const SwapTokens = ({
  amountA,
  amountB,
  setAmountB,
  slippage,
  tokenA,
  tokenB,
  publicClient,
  walletClient,
  routerAddress,
  ERC20ABI,
  UniswapV2Router02ABI,
  account,
  tokens,
  exchangeRate,
  getTokenDecimals,
  getTokenAddress,
  setNeedsApprovalA,
  needsApprovalA,
  setAllowanceA,
  error,
  getTokenUsdPrice,
}) => {
  const [minimumAmountOut, setMinimumAmountOut] = useState('0.000000');
  const [minReceivedUSD, setMinReceivedUSD] = useState('0.0'); // New state for minimum received USD value
  const [priceImpact, setPriceImpact] = useState('0.00');
  const { pushAlert } = useAlerts();

  const getDisplaySymbol = (tokenKey) => tokens[tokenKey]?.symbol || tokenKey;

  useEffect(() => {
    const calculateMinimumAmountOut = async () => {
      if (amountA !== '' && amountA >= 0.1 && slippage >= 0 && tokenA && tokenB && publicClient) {
        try {
          const decimalsA = getTokenDecimals(tokenA);
          const decimalsB = getTokenDecimals(tokenB);

          const amountIn = parseUnits(amountA.toString(), decimalsA || 18);

          const tokenAddressA = getTokenAddress(tokenA);
          const tokenAddressB = getTokenAddress(tokenB);

          if (!tokenAddressA || !tokenAddressB) {
            console.error('Invalid token addresses');
            return;
          }

          const amountsOut = await publicClient.readContract({
            address: routerAddress,
            abi: UniswapV2Router02ABI,
            functionName: 'getAmountsOut',
            args: [amountIn, [tokenAddressA, tokenAddressB]],
          });
          const expectedAmountOut = amountsOut[1];

          // Calculate the minimum amount out with slippage tolerance
          const precision = 1000n;
          const multiplier = BigInt(
            Math.floor((1 - slippage / 100) * Number(precision))
          );
          const calculatedAmountOutMin = (expectedAmountOut * multiplier) / precision;

          const formattedExpectedOut = formatUnits(expectedAmountOut, decimalsB);
          const impact = calculatePriceImpact({
            expectedAmountOut: formattedExpectedOut,
            exchangeRate,
            amountIn: amountA,
          });
          setPriceImpact(impact.toFixed(2));

          const formattedMinOut = formatUnits(calculatedAmountOutMin, decimalsB);
          const displayAmount = parseFloat(formattedMinOut).toFixed(6);

          setMinimumAmountOut(displayAmount);
          if (typeof setAmountB === 'function') {
            setAmountB(displayAmount);
          }

          // Calculate minReceivedUSD
          const minReceived = parseFloat(displayAmount);
          const tokenUsdPrice = getTokenUsdPrice(tokenB);
          const nextMinReceivedUSD =
            tokenUsdPrice && tokenUsdPrice > 0 ? (minReceived * tokenUsdPrice).toFixed(8) : '0.00';
          setMinReceivedUSD(nextMinReceivedUSD);
        } catch (error) {
          console.error('Error calculating minimum amount out:', error);
          setPriceImpact('0.00');
        }
      } else {
        setPriceImpact('0.00');
      }
    };

    calculateMinimumAmountOut();
  }, [
    amountA,
    slippage,
    tokenA,
    tokenB,
    publicClient,
    routerAddress,
    UniswapV2Router02ABI,
    getTokenAddress,
    getTokenDecimals,
    getTokenUsdPrice,
    exchangeRate,
  ]);

  const handleApprove = async (tokenSymbol, amount) => {
    try {
      if (!walletClient || !publicClient || !account) {
        pushAlert({
          variant: 'error',
          message: 'Please connect your wallet to approve tokens.',
        });
        return;
      }
      const tokenAddress = getTokenAddress(tokenSymbol);
      if (!tokenAddress) throw new Error(`Token address for ${tokenSymbol} not found`);
      const amountParsed = parseUnits(amount.toString(), getTokenDecimals(tokenSymbol));
      const receipt = await executeContractWrite({
        publicClient,
        walletClient,
        account,
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [routerAddress, amountParsed],
      });
      if (tokenSymbol === tokenA) {
        setAllowanceA(amountParsed);
        setNeedsApprovalA(false);
      }
      pushAlert({
        variant: 'approval',
        message: `${getDisplaySymbol(tokenSymbol)} approval confirmed.`,
        link: buildExplorerTxUrl(receipt?.transactionHash),
        linkLabel: 'Approved',
      });
    } catch (err) {
      console.error('Error approving token:', err);
      pushAlert({
        variant: 'error',
        message: err?.message || 'Error approving token.',
      });
    }
  };

  const handleSwapTokens = async () => {
    try {
      if (!walletClient || !publicClient || !account) {
        pushAlert({
          variant: 'error',
          message: 'Please connect your wallet to swap tokens.',
        });
        return;
      }
      if (!amountA || parseFloat(amountA) <= 0) {
        pushAlert({
          variant: 'error',
          message: 'Please enter a valid amount.',
        });
        return;
      }

      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);

      const amountIn = parseUnits(amountA.toString(), decimalsA || 18);

      const tokenAddressA = getTokenAddress(tokenA);
      const tokenAddressB = getTokenAddress(tokenB);

      if (!tokenAddressA || !tokenAddressB) {
        pushAlert({
          variant: 'error',
          message: 'Invalid token addresses.',
        });
        return;
      }

      const amountsOut = await publicClient.readContract({
        address: routerAddress,
        abi: UniswapV2Router02ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, [tokenAddressA, tokenAddressB]],
      });
      const expectedAmountOut = amountsOut[1];

      const precision = 1000n;
      const multiplier = BigInt(
        Math.floor((1 - slippage / 100) * Number(precision))
      );
      const amountOutMin = (expectedAmountOut * multiplier) / precision;

      const receipt = await executeContractWrite({
        publicClient,
        walletClient,
        account,
        address: routerAddress,
        abi: UniswapV2Router02ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          amountOutMin,
          [tokenAddressA, tokenAddressB],
          account,
          BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
        ],
      });

      const actualAmount =
        extractReceivedAmount({
          receipt,
          tokenAddress: tokenAddressB,
          decimals: decimalsB,
          account,
          ERC20ABI,
        }) ?? formatUnits(amountOutMin, decimalsB);

      pushAlert({
        variant: 'swap',
        message: `Tokens swapped successfully: Received ${actualAmount} ${getDisplaySymbol(
          tokenB,
        )}.`,
        link: buildExplorerTxUrl(receipt?.transactionHash),
        linkLabel: 'Swapped',
      });
    } catch (err) {
      console.error('Error swapping tokens:', err);
      pushAlert({
        variant: 'error',
        message: err?.message || 'Error swapping tokens.',
      });
    }
  };

  const renderButton = () => {
    if (needsApprovalA && tokenA) {
      return (
        <SwapButton onClick={() => handleApprove(tokenA, amountA)} disabled={!!error || !tokenA || !amountA || !walletClient}>
          Approve {tokens[getTokenAddress(tokenA)]?.symbol}
        </SwapButton>
      );
    }
    return (
      <SwapButton
        onClick={handleSwapTokens}
        disabled={!!error || !tokenA || !tokenB || !amountA || !amountB || !walletClient}
      >
        Swap Tokens
      </SwapButton>
    );
  };

  const priceImpactColor = getPriceImpactColor(Number(priceImpact));

  return (
    <>
      <div style={{ color: priceImpactColor }}>Price Impact: {priceImpact}%</div>
      <ExchangeRate>
       <span> Appx. Amount Received after Price Impact & Slippage: <b>{minimumAmountOut}</b>  <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}</span>
      </ExchangeRate>
      <GreyedOutUSD>(~${minReceivedUSD} USD)</GreyedOutUSD>
      {renderButton()}
      <ExchangeRate>
        Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="20" /> {tokens[tokenA]?.symbol} = {parseFloat(exchangeRate).toFixed(6)} <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
      </ExchangeRate>
    </>
  );
};

export default SwapTokens;
