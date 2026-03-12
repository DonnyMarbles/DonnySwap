import { useEffect, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { SwapButton, ExchangeRate, GreyedOutUSD } from '../../styles/SwapStyles';
import { executeContractWrite, getFeeData } from '../../lib/viemHelpers';
import { WRAPPED_PEAQ_ADDRESS } from '../../constants/contracts';
import { useAlerts } from '../../components/common/AlertProvider';
import { buildExplorerTxUrl } from '../../lib/explorer';
import { calculatePriceImpact, getPriceImpactColor, extractReceivedAmount } from '../../lib/tokenMath';

const SwapTokensPEAQ = ({
  publicClient,
  walletClient,
  amountA,
  amountB,
  setAmountB,
  slippage,
  tokenA,
  tokenB,
  routerAddress,
  ERC20ABI,
  UniswapV2Router02ABI,
  account,
  tokens,
  exchangeRate,
  getTokenDecimals,
  needsApprovalA,
  setAllowanceA,
  getTokenAddress,
  error,
  getTokenUsdPrice,
  setNeedsApprovalA,
}) => {
  const [priceImpact, setPriceImpact] = useState('0.00');
  const [minimumAmountOut, setMinimumAmountOut] = useState('0.000000');
  const [minReceivedUSD, setMinReceivedUSD] = useState('0.0');
  const { pushAlert } = useAlerts();

  const resolveTokenAddress = (token) =>
    token === 'PEAQ' ? WRAPPED_PEAQ_ADDRESS : getTokenAddress(token);

  const getDisplaySymbol = (tokenKey) => tokens[tokenKey]?.symbol || tokenKey;

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

  useEffect(() => {
    const calculateMinimumAmountOut = async () => {
      if (!walletClient || !publicClient || !account) return;
      if (amountA === '' || amountA < 0.1 || slippage < 0 || !tokenA || !tokenB) {
        setPriceImpact('0.00');
        return;
      }

      try {
        const decimalsA = getTokenDecimals(tokenA);
        const decimalsB = getTokenDecimals(tokenB);
        const amountIn = parseUnits(amountA.toString(), decimalsA || 18);

        const tokenAddressA = resolveTokenAddress(tokenA);
        const tokenAddressB = resolveTokenAddress(tokenB);
        if (!tokenAddressA || !tokenAddressB || tokenAddressA === tokenAddressB) {
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

        const formattedExpectedOut = formatUnits(expectedAmountOut, decimalsB);
        const impact = calculatePriceImpact({
          expectedAmountOut: formattedExpectedOut,
          exchangeRate,
          amountIn: amountA,
        });
        setPriceImpact(impact.toFixed(2));

        const precision = 1000n;
        const multiplier = BigInt(Math.floor((1 - slippage / 100) * Number(precision)));
        const calculatedAmountOutMin = (expectedAmountOut * multiplier) / precision;
        const formattedMinOut = formatUnits(calculatedAmountOutMin, decimalsB);
        const displayAmount = parseFloat(formattedMinOut).toFixed(6);

        setMinimumAmountOut(displayAmount);
        if (typeof setAmountB === 'function') {
          setAmountB(displayAmount);
        }

        const minReceived = parseFloat(displayAmount);
        const tokenUsdPrice = getTokenUsdPrice(tokenB);
        const nextMinReceivedUSD =
          tokenUsdPrice && tokenUsdPrice > 0 ? (minReceived * tokenUsdPrice).toFixed(8) : '0.00';
        setMinReceivedUSD(nextMinReceivedUSD);
      } catch (error) {
        console.error('Error calculating minimum amount out:', error);
        setPriceImpact('0.00');
      }
    };

    calculateMinimumAmountOut();
  }, [
    amountA,
    slippage,
    tokenA,
    tokenB,
    walletClient,
    publicClient,
    account,
    routerAddress,
    UniswapV2Router02ABI,
    getTokenAddress,
    getTokenDecimals,
    getTokenUsdPrice,
    exchangeRate,
  ]);

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

      const tokenAddressA = resolveTokenAddress(tokenA);
      const tokenAddressB = resolveTokenAddress(tokenB);
      const isPEAQInput = tokenA === 'PEAQ';
      const isPEAQOutput = tokenB === 'PEAQ';

      if (!tokenAddressA || !tokenAddressB || tokenAddressA === tokenAddressB) {
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
      const multiplier = BigInt(Math.floor((1 - slippage / 100) * Number(precision)));
      const amountOutMin = (expectedAmountOut * multiplier) / precision;

      const feeData = await getFeeData(publicClient);

      let receipt;
      if (isPEAQInput) {
        receipt = await executeContractWrite({
          publicClient,
          walletClient,
          account,
          address: routerAddress,
          abi: UniswapV2Router02ABI,
          functionName: 'swapExactETHForTokens',
          args: [
            amountOutMin,
            [tokenAddressA, tokenAddressB],
            account,
            BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
          ],
          value: amountIn,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        });
      } else if (isPEAQOutput) {
        receipt = await executeContractWrite({
          publicClient,
          walletClient,
          account,
          address: routerAddress,
          abi: UniswapV2Router02ABI,
          functionName: 'swapExactTokensForETH',
          args: [
            amountIn,
            amountOutMin,
            [tokenAddressA, tokenAddressB],
            account,
            BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
          ],
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        });
      } else {
        receipt = await executeContractWrite({
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
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        });
      }

      const tokenAddressForDecode = !isPEAQOutput ? resolveTokenAddress(tokenB) : null;
      const actualAmount = !isPEAQOutput
        ? extractReceivedAmount({
            receipt,
            tokenAddress: tokenAddressForDecode,
            decimals: decimalsB,
            account,
            ERC20ABI,
          }) ?? formatUnits(amountOutMin, decimalsB)
        : formatUnits(amountOutMin, decimalsB);

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
        <SwapButton
          onClick={() => handleApprove(tokenA, amountA)}
          disabled={!!error || !tokenA || !amountA || !walletClient}
        >
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
        <span>
          Appx. Amount Received after Price Impact & Slippage:{' '}
          <b>{minimumAmountOut}</b>{' '}
          <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
        </span>
      </ExchangeRate>
      <GreyedOutUSD>Minimum Received: ~${minReceivedUSD}</GreyedOutUSD>
      {renderButton()}
      <ExchangeRate>
        Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="20" />{' '}
        {tokens[tokenA]?.symbol} = {parseFloat(exchangeRate).toFixed(6)}{' '}
        <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
      </ExchangeRate>
    </>
  );
};

export default SwapTokensPEAQ;
