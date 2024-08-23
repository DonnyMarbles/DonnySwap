import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  RemoveLiquidityContainer,
  RemoveLiquidityButton,
  NoLiquidityMessage,
  LPTokenBalance,
  ErrorMessage,
  ExchangeRate,
} from '../styles/RemoveLiquidityStyles';

const RemoveLiquidityKRST = ({
  provider,
  amountA,
  tokenA,
  tokenB,
  signer,
  routerAddress,
  UniswapV2Router02ABI,
  UniswapV2FactoryABI,
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
  allowanceLP,
  handleBalanceClickIn
}) => {
  const [minimumTokenOut, setMinimumTokenOut] = useState(null);
  const [minimumKRSTOut, setMinimumKRSTOut] = useState(null);

  useEffect(() => {
    const calculateMinimumAmounts = async () => {
        if (amountA && tokenA && tokenB && signer && tokenA !== 'default' && tokenB !== 'default') {
            console.log("Starting calculateMinimumAmounts...");
            console.log(`amountA: ${amountA}`);
            console.log(`tokenA: ${tokenA}`);
            console.log(`tokenB: ${tokenB}`);
            console.log(`signer: ${signer}`);

            try {
                const routerContract = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);
                console.log("Router contract instantiated.");

                const factoryAddress = await routerContract.factory();
                console.log(`Factory Address: ${factoryAddress}`);
                const factoryContract = new ethers.Contract(factoryAddress, UniswapV2FactoryABI, signer);
                console.log("Factory contract instantiated.");

                const tokenAAddress = tokenA === 'KRST' ? tokens['0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc'].address : tokens[tokenA].address;
                const tokenBAddress = tokenB === 'KRST' ? tokens['0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc'].address : tokens[tokenB].address;
                console.log(`Token A Address: ${tokenAAddress}`);
                console.log(`Token B Address: ${tokenBAddress}`);

                const pairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);
                console.log(`Pair Address: ${pairAddress}`);
                if (!pairAddress || pairAddress === ethers.constants.AddressZero) {
                    console.error('Pair not found.');
                    return;
                }

                const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, signer);
                console.log("Pair contract instantiated.");

                const reserves = await pairContract.getReserves();
                console.log(`Reserves: ${reserves[0].toString()}, ${reserves[1].toString()}`);
                const totalSupply = await pairContract.totalSupply();
                console.log(`Total Supply: ${totalSupply.toString()}`);

                const reserveToken = tokenA === 'KRST' ? reserves[1] : reserves[0];
                const reserveKRST = tokenA === 'KRST' ? reserves[0] : reserves[1];
                console.log(`Reserve Token: ${reserveToken.toString()}`);
                console.log(`Reserve KRST: ${reserveKRST.toString()}`);

                // Convert amountA to BigNumber with 18 decimals
                const liquidityToRemoveBN = ethers.utils.parseUnits(amountA.toString(), 18);
                console.log(`Liquidity to Remove (BN): ${liquidityToRemoveBN.toString()}`);

                const amountTokenMin = liquidityToRemoveBN.mul(reserveToken).div(totalSupply);
                const amountKRSTMin = liquidityToRemoveBN.mul(reserveKRST).div(totalSupply);
                console.log(`Amount Token Min: ${amountTokenMin.toString()}`);
                console.log(`Amount KRST Min: ${amountKRSTMin.toString()}`);

                setMinimumTokenOut(ethers.utils.formatUnits(amountTokenMin, 18));
                setMinimumKRSTOut(ethers.utils.formatUnits(amountKRSTMin, 18));
                console.log(`Minimum Token Out (formatted): ${ethers.utils.formatUnits(amountTokenMin, 18)}`);
                console.log(`Minimum KRST Out (formatted): ${ethers.utils.formatUnits(amountKRSTMin, 18)}`);
            } catch (error) {
                console.error('Error calculating minimum amounts:', error);
            }
        }
    };

    calculateMinimumAmounts();
}, [amountA, tokenA, tokenB, signer]);



  const handleApprove = async (tokenSymbolA, tokenSymbolB, amount) => {
    const wrappedKrestAddress = "0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc";
    const tokenAddressA = tokenSymbolA === 'KRST' ? wrappedKrestAddress : tokens[tokenSymbolA]?.address;
    const tokenAddressB = tokenSymbolB === 'KRST' ? wrappedKrestAddress : tokens[tokenSymbolB]?.address;

    try {
      const pairAddress = await getPairAddress(getTokenAddress(tokenAddressA), getTokenAddress(tokenAddressB));
      if (!pairAddress || pairAddress === ethers.constants.AddressZero) throw new Error('Pair address not found');

      const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, signer);
      let amountParsed;
      if (amount < 0.01) {
          amountParsed = ethers.utils.parseUnits('0.01', 18);
      } else {
          amountParsed = ethers.utils.parseUnits(amount.toString(), 18);
      }      console.log(`Approving ${amountParsed.toString()} of LP tokens for ${tokenSymbolA}-${tokenSymbolB}`);

      const tx = await pairContract.approve(routerAddress, amountParsed);
      await tx.wait();

      setAllowanceLP(amountParsed);
      setNeedsApprovalLP(false);
  } catch (err) {
      console.error('Error approving LP tokens:', err);
  }
};

  const handleRemoveLiquidity = async () => {
    if (error) {
      return;
    }

    try {
      console.log("Starting handleRemoveLiquidityKRST...");

      const network = await provider.getNetwork();
      console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

      const liquidityToRemove = ethers.utils.parseUnits(amountA.toString(), 18);
      console.log(`Parsed Liquidity to Remove: ${liquidityToRemove.toString()}`);

      const routerContract = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);
      console.log(`Router contract instantiated with address: ${routerAddress}`);

      const factoryAddress = await routerContract.factory();
      console.log(`Factory Address: ${factoryAddress}`);

      const factoryContract = new ethers.Contract(factoryAddress, UniswapV2FactoryABI, signer);
      console.log("Factory Contract instantiated.");

      // Handle the scenario where KRST is selected
      let tokenAAddress = tokenA === 'KRST' ? tokens['0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc'].address : tokens[tokenA].address;
      let tokenBAddress = tokenB === 'KRST' ? tokens['0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc'].address : tokens[tokenB].address;

      const pairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);
      console.log(`Pair Address: ${pairAddress}`);

      const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, signer);
      console.log("Pair Contract instantiated.");

      const reserves = await pairContract.getReserves();
      console.log(`Reserves: ${reserves[0].toString()} ${reserves[1].toString()}`);

      const totalSupply = await pairContract.totalSupply();
      console.log(`Total Supply: ${totalSupply.toString()}`);

      const reserveToken = tokenA === 'KRST' ? reserves[1] : reserves[0];
      const reserveETH = tokenA === 'KRST' ? reserves[0] : reserves[1];
      console.log(`Reserve Token: ${reserveToken.toString()}`);
      console.log(`Reserve ETH: ${reserveETH.toString()}`);

      const amountTokenMin = liquidityToRemove.mul(reserveToken).div(totalSupply);
      const amountETHMin = liquidityToRemove.mul(reserveETH).div(totalSupply);
      console.log(`Amount Token Min: ${amountTokenMin.toString()}`);
      console.log(`Amount ETH Min: ${amountETHMin.toString()}`);

      const tx = await routerContract.removeLiquidityETH(
        tokenBAddress, // Use the ERC-20 token's address (MRBL in this case)
        liquidityToRemove, // Number of LP tokens to remove
        amountTokenMin, // Minimum amount of tokens to receive
        amountETHMin, // Minimum amount of ETH to receive
        account, // Address to send the output to
        Math.floor(Date.now() / 1000) + 60 * 20 // Deadline: 20 minutes from now
      );

      console.log("Transaction prepared, sending...");
      await tx.wait();

      alert('Liquidity removed successfully');
    } catch (err) {
      console.error('Error removing liquidity:', err);
      alert(`Error removing liquidity: ${err.message}`);
    }
  };


  const renderButton = () => {
    if (needsApprovalLP && tokenA) {
      console.log(`Needs approval for LP: ${tokenA} - ${tokenB} LP`);
      return (
        <RemoveLiquidityButton onClick={() => handleApprove(tokenA, tokenB, amountA)} disabled={!!error || !tokenA || !amountA}>
          Approve {tokens[tokenA]?.symbol} - {tokens[tokenB]?.symbol} LP
        </RemoveLiquidityButton>
      );
    }
    return (
      <RemoveLiquidityButton onClick={handleRemoveLiquidity} disabled={!!error || !tokenA || !tokenB || !amountA}>
        Remove Liquidity
      </RemoveLiquidityButton>
    );
  };

  return (
    <>
      <LPTokenBalance>
      LP Balance:<a><span onClick={handleBalanceClickIn} id={`balance-${tokenA}-${tokenB}`}>{lpBalance}</span></a>
      </LPTokenBalance>
      <LPTokenBalance>
        <p>
          Minimum <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol} Received:
          {tokenA === 'KRST' ? minimumKRSTOut : minimumTokenOut ? parseFloat(minimumTokenOut).toFixed(6) : ' Awaiting Input... '}
          <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol}
        </p>
        <p>
          Minimum <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol} Received:
          {tokenB === 'KRST' ? minimumKRSTOut : minimumTokenOut ? parseFloat(minimumTokenOut).toFixed(6) : ' Awaiting Input... '}
          <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol}
        </p>
      </LPTokenBalance>
      <br/>
      {renderButton()}
      <br/>
      <ExchangeRate>
        Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol} = {parseFloat(exchangeRate).toFixed(6)} <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol}
      </ExchangeRate>
      {noLiquidity && (
        <NoLiquidityMessage>No Pair Found! Create your own</NoLiquidityMessage>
      )}
      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
    </>
  );
};

export default RemoveLiquidityKRST;
