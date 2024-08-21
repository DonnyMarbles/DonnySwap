import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { SwapButton, ExchangeRate } from '../styles/SwapStyles';

const SwapTokens = ({
  provider,
  amountA,
  amountB,
  slippage,
  tokenA,
  tokenB,
  signer,
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
  error
}) => {
  const [minimumAmountOut, setMinimumAmountOut] = useState(null);
  const checkBalance = async (tokenSymbol, setBalance) => {
    try {
      const balance = tokenSymbol === 'KRST'
        ? await provider.getBalance(account)
        : await new ethers.Contract(getTokenAddress(tokenSymbol), ERC20ABI, provider).balanceOf(account);
      setBalance(ethers.utils.formatUnits(balance, getTokenDecimals(tokenSymbol)));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance('');
    }
  };
  const handleApprove = async (tokenSymbol, amount) => {
    try {
      const tokenAddress = getTokenAddress(tokenSymbol);
      if (!tokenAddress) throw new Error(`Token address for ${tokenSymbol} not found`);
      const contract = new ethers.Contract(tokenAddress, ERC20ABI, signer);
      const amountParsed = ethers.utils.parseUnits(amount.toString(), getTokenDecimals(tokenSymbol));
      console.log(`Approving ${amountParsed.toString()} of ${tokenSymbol}`);
      const tx = await contract.approve(routerAddress, amountParsed);
      await tx.wait();
      if (tokenSymbol === tokenA) {
        setAllowanceA(amountParsed);
        setNeedsApprovalA(false);
      }
    } catch (err) {
      console.error('Error approving token:', err);
    }
  };
  useEffect(() => {
    const calculateMinimumAmountOut = async () => {
      if (amountA != '0.' && slippage >= 0 && tokenA && tokenB && signer) {
        try {
          const wrappedKrestAddress = "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc";

          // Resolve token addresses, using WKREST if KRST is involved
          const tokenAddressA = tokenA === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenA);
          const tokenAddressB = tokenB === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenB);

          if (!tokenAddressA || !tokenAddressB) {
            console.error('Invalid token addresses');
            return;
          }

          const decimalsA = getTokenDecimals(tokenA === 'KRST' ? 'WKREST' : tokenA);
          const decimalsB = getTokenDecimals(tokenB === 'KRST' ? 'WKREST' : tokenB);

          const amountIn = ethers.utils.parseUnits(amountA.toString(), decimalsA || 18);

          const contract = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);

          // Get expected amount out from the contract to include price impact
          const amountsOut = await contract.getAmountsOut(amountIn, [tokenAddressA, tokenAddressB]);
          const expectedAmountOut = amountsOut[1]; // The amount you would get without slippage

          // Calculate the minimum amount out with slippage tolerance
          const slippageMultiplier = (1 - slippage / 100);
          const calculatedAmountOutMin = expectedAmountOut.mul(ethers.BigNumber.from(Math.floor(slippageMultiplier * 1000))).div(1000);

          setMinimumAmountOut(ethers.utils.formatUnits(calculatedAmountOutMin, decimalsB));
        } catch (error) {
          console.error('Error calculating minimum amount out:', error);
        }
      }
    };
    calculateMinimumAmountOut();
  }, [amountA, slippage, tokenA, tokenB, signer]);

  const handleSwapTokensKRST = async () => {
    try {
      if (!amountA || parseFloat(amountA) <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);

      const amountIn = ethers.utils.parseUnits(amountA.toString(), decimalsA || 18);

      const wrappedKrestAddress = "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc";
      const tokenAddressA = tokenA === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenA);
      const tokenAddressB = tokenB === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenB);

      if (!tokenAddressA || !tokenAddressB) {
        alert('Invalid token addresses');
        return;
      }

      const contract = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);

      // Get expected amount out from the contract to include price impact
      const amountsOut = await contract.getAmountsOut(amountIn, [tokenAddressA, tokenAddressB]);
      const expectedAmountOut = amountsOut[1]; // The amount you would get, considering price impact

      // Log the price impact and expected output
      console.log(`Expected output (considering price impact): ${ethers.utils.formatUnits(expectedAmountOut, decimalsB)} ${tokens[tokenB]?.symbol}`);

      // Calculate the minimum amount out with slippage tolerance applied
      const slippageMultiplier = (1 - slippage / 100);
      const amountOutMin = expectedAmountOut.mul(ethers.BigNumber.from(Math.floor(slippageMultiplier * 1000))).div(1000);

      console.log(`Amount Out Min (considering slippage tolerance): ${ethers.utils.formatUnits(amountOutMin, decimalsB)} ${tokens[tokenB]?.symbol}`);

      let tx;

      if (tokenA === 'KRST') {
        // swapExactETHForTokens
        tx = await contract.swapExactETHForTokens(
          amountOutMin.toString(),
          [wrappedKrestAddress, tokenAddressB],
          account,
          Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
          { value: amountIn } // Value must be provided when swapping ETH
        );
      } else if (tokenB === 'KRST') {
        // swapTokensForExactETH
        tx = await contract.swapTokensForExactETH(
          amountOutMin.toString(),
          amountIn,
          [tokenAddressA, wrappedKrestAddress],
          account,
          Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
        );
      } else {
        alert('Invalid swap configuration for KRST');
        return;
      }

      await tx.wait();
      alert(`Tokens swapped successfully: Received at least ${ethers.utils.formatUnits(amountOutMin, decimalsB)} ${tokens[tokenB]?.symbol}`);
    } catch (err) {
      console.error("Error swapping tokens:", err);
      alert(`Error swapping tokens: ${err.message}`);
    }
  };
  const renderButton = () => {
    if (needsApprovalA && tokenA) {
      console.log(`Needs approval for tokenA: ${tokenA}`);
      return (
        <SwapButton onClick={() => handleApprove(tokenA, amountA)} disabled={!!error || !tokenA || !amountA}>
          Approve {tokens[getTokenAddress(tokenA)]?.symbol}
        </SwapButton>
      );
    }
    return (
      <SwapButton onClick={handleSwapTokensKRST} disabled={!!error || !tokenA || !tokenB || !amountA || !amountB}>
        Swap Tokens
      </SwapButton>
    );
  };
  return (
    <>
      <ExchangeRate>
        Minimum Received: {parseFloat(minimumAmountOut).toFixed(6)} <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
      </ExchangeRate>
      {renderButton()}
      <ExchangeRate>
        Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="20" /> {tokens[tokenA]?.symbol} = {parseFloat(exchangeRate).toFixed(6)} <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
      </ExchangeRate>
    </>
  );
};

export default SwapTokens;
