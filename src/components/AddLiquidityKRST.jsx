import React from 'react';
import { ethers } from 'ethers';
import { useSigner, useAccount } from 'wagmi';
import {
  AddLiquidityContainer,
  AddLiquidityButton,
  LPTokenBalance,
  ExchangeRate,
  NoLiquidityMessage,
  ErrorMessage,
} from '../styles/AddLiquidityStyles';

const AddLiquidityKRST = ({
  amountA,
  amountB,
  tokenA,
  tokenB,
  routerAddress,
  ERC20ABI,
  UniswapV2Router02ABI,
  tokens,
  exchangeRate,
  getTokenDecimals,
  getTokenAddress,
  setNeedsApprovalA,
  setNeedsApprovalB,
  needsApprovalA,
  needsApprovalB,
  noLiquidity,
  lpBalance,
  setAllowanceA,
  setAllowanceB,
  error
}) => {
  const { data: signer } = useSigner(); // Get the signer using wagmi's useSigner hook
  const { address: account } = useAccount(); // Get the connected account using wagmi's useAccount hook

  const handleApprove = async (tokenSymbol, amount) => {
    try {
      if (tokenSymbol === 'KRST'){
        return;
      }
      const decimals = getTokenDecimals(tokenSymbol);
      let amountParsed = ethers.utils.parseUnits(amount.toString(), decimals);
      const tokenAddress = getTokenAddress(tokenSymbol);
      if (!tokenAddress) throw new Error(`Token address for ${tokenSymbol} not found`);
      const contract = new ethers.Contract(tokenAddress, ERC20ABI, signer);      
      console.log(`Approving ${amountParsed.toString()} of ${tokenSymbol}`);
      const tx = await contract.approve(routerAddress, amountParsed);
      await tx.wait();
      if (tokenSymbol === tokenA) {
        setAllowanceA(amountParsed);
        setNeedsApprovalA(false);
      } else {
        setAllowanceB(amountParsed);
        setNeedsApprovalB(false);
      }
    } catch (err) {
      console.error('Error approving token:', err);
    }
  };

  const handleAddLiquidity = async () => {
    if (error) {
      return;
    }

    try {
      const amountADesired = ethers.utils.parseUnits(amountA.toString(), 18);
      const amountBDesired = ethers.utils.parseUnits(amountB.toString(), 18);

      const contract = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);

      const [token, amountTokenDesired, amountETHDesired] = tokenA === 'KRST'
        ? [tokenB, amountBDesired, amountA]
        : [tokenA, amountADesired, amountB];

      const tx = await contract.addLiquidityETH(
        token,
        amountTokenDesired,
        0, // Min amount of token
        0, // Min amount of ETH
        account,
        Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        { value: ethers.utils.parseUnits(amountETHDesired.toString(), 18) }
      );
      await tx.wait();

      alert('Liquidity added successfully');
    } catch (err) {
      console.error('Error adding liquidity:', err);
      alert(`Error adding liquidity: ${err.message}`);
    }
  };

  const renderButton = () => {
    if (needsApprovalA && tokenA) {
      console.log(`Needs approval for tokenA: ${tokenA}`);
      return (
        <AddLiquidityButton onClick={() => handleApprove(tokenA, amountA)} disabled={!!error || !tokenA || !amountA}>
          Approve {tokens[getTokenAddress(tokenA)]?.symbol}
        </AddLiquidityButton>
      );
    }
    if (needsApprovalB && tokenB) {
      console.log(`Needs approval for tokenB: ${tokenB}`);
      return (
        <AddLiquidityButton onClick={() => handleApprove(tokenB, amountB)} disabled={!!error || !tokenB || !amountB}>
          Approve {tokens[getTokenAddress(tokenB)]?.symbol}
        </AddLiquidityButton>
      );
    }
    return (
      <AddLiquidityButton onClick={handleAddLiquidity} disabled={!!error || !tokenA || !tokenB || !amountA || !amountB}>
        Add Liquidity
      </AddLiquidityButton>
    );
  };

  return (
    <AddLiquidityContainer>
      <LPTokenBalance>
        LP Token Balance: {lpBalance}
      </LPTokenBalance>
      <ExchangeRate>
        Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="20" /> {tokens[tokenA]?.symbol} = {parseFloat(exchangeRate).toFixed(6)} <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
      </ExchangeRate>
      {renderButton()}
      {noLiquidity && (
        <NoLiquidityMessage>No Pair Found! Create your own</NoLiquidityMessage>
      )}
      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
    </AddLiquidityContainer>
  );
};

export default AddLiquidityKRST;
