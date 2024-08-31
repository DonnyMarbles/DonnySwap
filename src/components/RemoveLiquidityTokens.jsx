import React, { useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import {
    RemoveLiquidityContainer,
    RemoveLiquidityButton,
    NoLiquidityMessage,
    LPTokenBalance,
    ErrorMessage,
    ExchangeRate,
} from '../styles/RemoveLiquidityStyles';

const RemoveLiquidityTokens = ({
    provider,
    amountA,
    amountB,
    tokenA,
    tokenB,
    signer,
    routerAddress,
    ERC20ABI,
    UniswapV2Router02ABI,
    UniswapV2FactoryABI,
    UniswapV2PairABI,
    account,
    tokens,
    exchangeRate,
    getTokenDecimals,
    getPairAddress,
    getTokenAddress,
    setNeedsApprovalA,
    setNeedsApprovalB,
    needsApprovalA,
    needsApprovalB,
    setAllowanceA,
    setAllowanceB,
    noLiquidity,
    lpBalance,
    allowanceA,
    allowanceB,
    error,
    checkIfNeedsApproval,
    needsApprovalLP,
    setNeedsApprovalLP,
    allowanceLP,
    setAllowanceLP,
    handleBalanceClickIn


}) => {
    const [minimumTokenAOut, setMinimumTokenAOut] = useState(null);
    const [minimumTokenBOut, setMinimumTokenBOut] = useState(null);

    const calculateMinimumAmounts = async (liquidityParsed, reserves, totalSupply, slippage = 1) => {
        const amountTokenAMin = liquidityParsed.mul(reserves[0]).div(totalSupply);
        const amountTokenBMin = liquidityParsed.mul(reserves[1]).div(totalSupply);
    
        const slippageMultiplier = ethers.BigNumber.from(100).sub(slippage);
        const amountTokenAMinWithSlippage = amountTokenAMin.mul(slippageMultiplier).div(100);
        const amountTokenBMinWithSlippage = amountTokenBMin.mul(slippageMultiplier).div(100);
    
        return {
            amountTokenAMin: ethers.utils.formatUnits(amountTokenAMinWithSlippage, 18),
            amountTokenBMin: ethers.utils.formatUnits(amountTokenBMinWithSlippage, 18),
            amountTokenAMinRaw: amountTokenAMinWithSlippage,
            amountTokenBMinRaw: amountTokenBMinWithSlippage
        };
    };

    useEffect(() => {
        const calculateMinimumAmountsEffect = async () => {
            if (amountA && tokenA && tokenB && signer && tokenA !== 'default' && tokenB !== 'default') {
                console.log("Starting calculateMinimumAmounts...");
    
                const routerContract = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);
                const factoryAddress = await routerContract.factory();
                const factoryContract = new ethers.Contract(factoryAddress, UniswapV2FactoryABI, signer);
    
                const tokenAAddress = tokenA === 'KRST' ? tokens['0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc'].address : tokens[tokenA].address;
                const tokenBAddress = tokenB === 'KRST' ? tokens['0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc'].address : tokens[tokenB].address;
    
                const pairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);
                const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, signer);
    
                const reserves = await pairContract.getReserves();
                const totalSupply = await pairContract.totalSupply();
    
                const liquidityParsed = ethers.utils.parseUnits(amountA.toString(), 18);
    
                const { amountTokenAMin, amountTokenBMin } = await calculateMinimumAmounts(liquidityParsed, [reserves[0], reserves[1]], totalSupply);
    
                setMinimumTokenAOut(amountTokenAMin);
                setMinimumTokenBOut(amountTokenBMin);
            }
        };
    
        calculateMinimumAmountsEffect();
    }, [amountA, tokenA, tokenB, signer]);

    const handleApprove = async (tokenSymbolA, tokenSymbolB, amount) => {
        try {
            const pairAddress = await getPairAddress(getTokenAddress(tokenSymbolA), getTokenAddress(tokenSymbolB));
            if (!pairAddress || pairAddress === ethers.constants.AddressZero) throw new Error('Pair address not found');
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, signer);

            let amountParsed = ethers.utils.parseUnits(amount.toString(), 18); 
            console.log(`Approving ${amountParsed.toString()} of LP tokens for ${tokenSymbolA}-${tokenSymbolB}`);
    
            const tx = await pairContract.approve(routerAddress, amountParsed);
            await tx.wait();
    
            setAllowanceLP(amountParsed);
            setNeedsApprovalLP(false);
        } catch (err) {
            console.error('Error approving LP tokens:', err);
        }
    };
    
    

    const handleRemoveLiquidity = async () => {
        try {
            const router = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);
            const tokenAddressA = getTokenAddress(tokenA);
            const tokenAddressB = getTokenAddress(tokenB);
    
            if (!tokenAddressA || !tokenAddressB) {
                console.error('Token addresses are not valid.');
                return;
            }
    
            const pairAddress = await getPairAddress(tokenAddressA, tokenAddressB);
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
            const reserves = await pairContract.getReserves();
            const totalSupply = await pairContract.totalSupply();
            const liquidityParsed = ethers.utils.parseUnits(amountA.toString(), 18);
    
            const { amountTokenAMinRaw, amountTokenBMinRaw } = await calculateMinimumAmounts(liquidityParsed, [reserves._reserve0, reserves._reserve1], totalSupply, 1); // 1% slippage
    
            const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
    
            console.log(`Removing liquidity: ${liquidityParsed.toString()} LP tokens for ${tokenA}-${tokenB}`);
            console.log(`Minimum amounts: ${ethers.utils.formatUnits(amountTokenAMinRaw, 18)} ${tokenA}, ${ethers.utils.formatUnits(amountTokenBMinRaw, 18)} ${tokenB}`);
    
            const tx = await router.removeLiquidity(
                tokenAddressA,
                tokenAddressB,
                liquidityParsed,
                amountTokenAMinRaw,
                amountTokenBMinRaw,
                account,
                deadline
            );
            await tx.wait();
            console.log(`Removed liquidity: ${liquidityParsed.toString()} ${tokenA}-${tokenB} LP Tokens`);
        } catch (err) {
            console.error('Error removing liquidity:', err);
        }
    };

    const renderButton = () => {
        if (needsApprovalLP && tokenA) {
            console.log(`Needs approval for LP: ${tokenA} - ${tokenB} LP`);
            return (
                <RemoveLiquidityButton onClick={() => handleApprove(tokenA, tokenB, amountA)} disabled={!!error || !tokenA || !amountA}>
                    Approve {tokens[getTokenAddress(tokenA)]?.symbol} - {tokens[getTokenAddress(tokenB)]?.symbol} LP
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
            LP Balance:<a><span onClick={handleBalanceClickIn} id={`balance-${lpBalance}`}>{lpBalance}</span></a>
            </LPTokenBalance>
            <LPTokenBalance>
                <p>
                    Minimum <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol} Received:
                    {tokenA === 'KRST' ? minimumKRSTOut : minimumTokenAOut ? parseFloat(minimumTokenAOut).toFixed(6) : ' Awaiting Input... '}
                    <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="15" /> {tokens[tokenA]?.symbol}
                </p>
                <p>
                    Minimum <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol} Received:
                    {tokenB === 'KRST' ? minimumKRSTOut : minimumTokenBOut ? parseFloat(minimumTokenBOut).toFixed(6) : ' Awaiting Input... '}
                    <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="15" /> {tokens[tokenB]?.symbol}
                </p>
            </LPTokenBalance>
            <br/>
            {renderButton()}
            <br/>
            <ExchangeRate>
                Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="20" /> {tokens[tokenA]?.symbol} = {parseFloat(exchangeRate).toFixed(6)} <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
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

export default RemoveLiquidityTokens;
