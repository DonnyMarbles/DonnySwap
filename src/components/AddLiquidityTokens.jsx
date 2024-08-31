import React, { useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import {
    AddLiquidityContainer,
    AddLiquidityButton,
    NoLiquidityMessage,
    LPTokenBalance,
    ErrorMessage,
    ExchangeRate,
} from '../styles/AddLiquidityStyles';

const AddLiquidityTokens = ({
    amountA,
    amountB,
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
    checkIfNeedsApproval
}) => {

    const handleApprove = async (tokenSymbol, amount) => {
        try {
            const tokenAddress = getTokenAddress(tokenSymbol);
            if (!tokenAddress) throw new Error(`Token address for ${tokenSymbol} not found`);
    
            const decimals = getTokenDecimals(tokenSymbol);
            let amountParsed = ethers.utils.parseUnits(amount.toString(), decimals);        
            console.log(`Approving ${amountParsed.toString()} of ${tokenSymbol}`);
            const contract = new ethers.Contract(tokenAddress, ERC20ABI, signer);
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
        try {
            const router = new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer);
            const tokenAddressA = getTokenAddress(tokenA);
            const tokenAddressB = getTokenAddress(tokenB);
            const amountADesired = ethers.utils.parseUnits(amountA.toString(), getTokenDecimals(tokenA));
            const amountBDesired = ethers.utils.parseUnits(amountB.toString(), getTokenDecimals(tokenB));
            const amountAMin = ethers.utils.parseUnits((amountA * 0.95).toString(), getTokenDecimals(tokenA));
            const amountBMin = ethers.utils.parseUnits((amountB * 0.95).toString(), getTokenDecimals(tokenB));

            console.log(`Adding liquidity: ${amountADesired} of ${tokenA}, ${amountBDesired} of ${tokenB}`);
            const tx = await router.addLiquidity(
                tokenAddressA,
                tokenAddressB,
                amountADesired,
                amountBDesired,
                amountAMin,
                amountBMin,
                account,
                Math.floor(Date.now() / 1000) + 60 * 10,
            );
            await tx.wait();
        } catch (err) {
            console.error('Error adding liquidity:', err);
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

export default AddLiquidityTokens;
