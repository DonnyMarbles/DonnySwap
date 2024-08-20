import React, { useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import { Web3Context } from '../contexts/Web3Context';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import {
    RemoveLiquidityContainer,
    RemoveLiquidityInputContainer,
    RemoveLiquidityButton,
    TokenInfo,
    NoLiquidityMessage,
    LPTokenBalance,
    ErrorMessage,
    ExchangeRate,
} from '../styles/RemoveLiquidityStyles';

const RemoveLiquidityTokens = ({ tokenA, tokenB, onTokenSelection, error }) => {
    const { provider, signer, account } = useContext(Web3Context);
    const { UniswapV2Router02ABI, UniswapV2PairABI, UniswapV2FactoryABI, ERC20ABI, WrappedKRESTABI } = useContext(ABIContext);
    const { tokens, routerAddress } = useContext(TokenContext);
    const [amountA, setAmountA] = useState(0);
    const [amountB, setAmountB] = useState(0);
    const [balanceA, setBalanceA] = useState(0);
    const [balanceB, setBalanceB] = useState(0);
    const [noLiquidity, setNoLiquidity] = useState(false);
    const [lpBalance, setLpBalance] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(null);
    const [allowanceLP, setAllowanceLP] = useState(ethers.constants.Zero);
    const [allowanceB, setAllowanceB] = useState(ethers.constants.Zero);
    const [needsApprovalLP, setNeedsApprovalLP] = useState(false);

    const [blockNumber, setBlockNumber] = useState(0);

    useEffect(() => {
        if (provider) {
            const updateBlockNumber = async () => {
                const blockNumber = await provider.getBlockNumber();
                setBlockNumber(blockNumber);
            };

            const interval = setInterval(updateBlockNumber, 1000);
            return () => clearInterval(interval);
        }
    }, [provider]);

    useEffect(() => {
        if (tokenA && account && tokenA !== "") {
            checkBalance(tokenA, setBalanceA);
        }
        if (tokenB && account && tokenB !== "") {
            checkBalance(tokenB, setBalanceB);
        }
        if (tokenA && tokenB && tokenA !== tokenB && !((tokenA === 'KRST' && tokenB === 'WKREST') || (tokenA === 'WKREST' && tokenB === 'KRST')) && tokenA !== "default" && tokenB !== "default") {
            checkLPTokenBalance(tokenA, tokenB);
            checkAllowance(tokenA, tokenB, setAllowanceLP, setNeedsApprovalLP, amountA);
            calculateExchangeRate(tokenA, tokenB);
        }
    }, [tokenA, tokenB, account, blockNumber, amountA]);

    useEffect(() => {
        if (amountA && tokenA && tokenB && tokenA !== "" && tokenB !== "") {
            checkIfNeedsApproval(tokenA, tokenB, amountA, allowanceLP, setNeedsApprovalLP);
        }
    }, [amountA, tokenA, tokenB, allowanceLP, allowanceB]);

    const getTokenAddress = (tokenSymbol) => {
        if (tokenSymbol === 'KRST') return null; // KRST is native token, no contract address
        const token = Object.values(tokens).find(token => token.symbol === tokenSymbol);
        return token ? token.address : null;
    };

    const getTokenDecimals = (tokenSymbol) => {
        const token = Object.values(tokens).find(token => token.symbol === tokenSymbol);
        return token ? token.decimals : 18;
    };

    const checkBalance = async (tokenSymbol, setBalance) => {
        try {
            let balance;
            const tokenAddress = getTokenAddress(tokenSymbol);
            if (!tokenAddress && tokenSymbol !== 'KRST') throw new Error(`Token address for ${tokenSymbol} not found`);
            if (tokenSymbol === 'KRST') {
                balance = await provider.getBalance(account);
            } else {
                const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
                balance = await contract.balanceOf(account);
            }
            setBalance(ethers.utils.formatUnits(balance, getTokenDecimals(tokenSymbol)));
        } catch (err) {
            console.error('Error fetching balance:', err);
            setBalance('');
        }
    };

    const checkAllowance = async (tokenSymbolA, tokenSymbolB, setAllowance, setNeedsApprovalLP, amount) => {
        try {
            if (amount === 0) {
                return; // Skip check if token is not selected
            }
            const tokenAddressA = getTokenAddress(tokenSymbolA);
            const tokenAddressB = getTokenAddress(tokenSymbolB);
            if (!tokenAddressA && tokenSymbolA !== 'KRST') {
                throw new Error(`Token address for ${tokenSymbolA} not found`);
            }
            if (tokenSymbolA === 'KRST') {
                setAllowance(ethers.constants.MaxUint256); // Native token doesn't need allowance
            } else {
                const pairAddress = await getPairAddress(tokenAddressA, tokenAddressB);
                const contract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
                const allowance = await contract.allowance(account, routerAddress);
                setAllowance(allowance);
                console.log(`Allowance for ${tokenSymbolA} - ${tokenSymbolB} LP: ${allowance.toString()}`);
                checkIfNeedsApproval(tokenSymbolA, tokenSymbolB, amount, allowance, setNeedsApprovalLP);
            }
        } catch (err) {
            console.error('Error fetching allowance:', err);
            setAllowance(ethers.constants.Zero);
            setNeedsApprovalLP(true);
        }
    };

    const checkIfNeedsApproval = async (tokenSymbolA, tokenSymbolB, amount, allowance, setNeedsApprovalLP) => {
        if (tokenSymbolA === "default" || tokenSymbolB === "default") {
            return; // Skip check if tokens are not selected
        }
    
        const pairAddress = await getPairAddress(getTokenAddress(tokenSymbolA), getTokenAddress(tokenSymbolB));
        if (!pairAddress || pairAddress === ethers.constants.AddressZero) {
            console.error(`Pair address not found for ${tokenSymbolA}-${tokenSymbolB}`);
            setNeedsApprovalLP(true);
            return;
        }
    
        try {
            const amountParsed = ethers.utils.parseUnits(amount.toString(), 18);
            console.log(`Amount parsed for LP tokens of ${tokenSymbolA}-${tokenSymbolB}: ${amountParsed}, Allowance: ${allowance}`);
            setNeedsApprovalLP(amountParsed.gt(allowance));
        } catch (err) {
            console.error(`Error parsing amount for LP tokens of ${tokenSymbolA}-${tokenSymbolB}:`, err);
            setNeedsApprovalLP(true);
        }
    };

    const handleApprove = async (tokenSymbolA, tokenSymbolB, amount) => {
        try {
            const pairAddress = await getPairAddress(getTokenAddress(tokenSymbolA), getTokenAddress(tokenSymbolB));
            if (!pairAddress || pairAddress === ethers.constants.AddressZero) throw new Error('Pair address not found');
            
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, signer);
            const amountParsed = ethers.utils.parseUnits(amount.toString(), 18);
            console.log(`Approving ${amountParsed.toString()} of LP tokens for ${tokenSymbolA}-${tokenSymbolB}`);
            
            const tx = await pairContract.approve(routerAddress, amountParsed);
            await tx.wait();
            
            setAllowanceLP(amountParsed);
            setNeedsApprovalLP(false);
        } catch (err) {
            console.error('Error approving LP tokens:', err);
        }
    };

    const checkLPTokenBalance = async (tokenSymbolA, tokenSymbolB) => {
        try {
            const tokenAddressA = getTokenAddress(tokenSymbolA);
            const tokenAddressB = getTokenAddress(tokenSymbolB);
            const pairAddress = await getPairAddress(tokenAddressA, tokenAddressB);
            if (!pairAddress || pairAddress === ethers.constants.AddressZero) {
                setNoLiquidity(true);
                return;
            }

            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
            const balance = await pairContract.balanceOf(account);
            setLpBalance(ethers.utils.formatUnits(balance, 18));
            setNoLiquidity(false);
        } catch (err) {
            console.error('Error fetching LP token balance:', err);
            setNoLiquidity(false);
        }
    };

    const calculateExchangeRate = async (tokenSymbolA, tokenSymbolB) => {
        try {
            const tokenAddressA = getTokenAddress(tokenSymbolA);
            const tokenAddressB = getTokenAddress(tokenSymbolB);
            const pairAddress = await getPairAddress(tokenAddressA, tokenAddressB);
            if (!pairAddress || pairAddress === ethers.constants.AddressZero) {
                setExchangeRate(null);
                return;
            }

            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
            const reserves = await pairContract.getReserves();
            const token0 = await pairContract.token0();
            const token1 = await pairContract.token1();

            let reserveA, reserveB;

            if (tokenAddressA.toLowerCase() === token0.toLowerCase()) {
                reserveA = reserves._reserve0;
                reserveB = reserves._reserve1;
            } else {
                reserveA = reserves._reserve1;
                reserveB = reserves._reserve0;
            }

            // Calculate rate based on tokenA to tokenB
            const rate = reserveA.gt(0) ? ethers.utils.formatUnits(reserveB, getTokenDecimals(tokenSymbolB)) / ethers.utils.formatUnits(reserveA, getTokenDecimals(tokenSymbolA)) : "0";
            setExchangeRate(rate);
        } catch (err) {
            console.error('Error calculating exchange rate:', err);
            setExchangeRate(null);
        }
    };

    const getPairAddress = async (tokenAddressA, tokenAddressB) => {
        if (!tokenAddressA || !tokenAddressB || (tokenAddressA === ethers.constants.AddressZero && tokenAddressB === ethers.constants.AddressZero)) {
            return ethers.constants.AddressZero;
        }
        const factoryAddress = '0x23aAC8C182b2C2a2387868ee98C1544bF705c097';
        const factoryContract = new ethers.Contract(factoryAddress, UniswapV2FactoryABI, provider);
        return await factoryContract.getPair(tokenAddressA, tokenAddressB);
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
            if (!pairAddress || pairAddress === ethers.constants.AddressZero) {
                console.error('Pair address not found.');
                return;
            }
    
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
            const reserves = await pairContract.getReserves();
            const token0 = await pairContract.token0();
            const [reserveA, reserveB] = token0.toLowerCase() === tokenAddressA.toLowerCase() ? [reserves._reserve0, reserves._reserve1] : [reserves._reserve1, reserves._reserve0];
    
            const totalSupply = await pairContract.totalSupply();
            const liquidityParsed = ethers.utils.parseUnits(amountA.toString(), 18); // LP tokens to remove
    
            // Calculate the minimum amounts with 1% slippage
            const amountMinA = reserveA.mul(liquidityParsed).div(totalSupply).mul(99).div(100); 
            const amountMinB = reserveB.mul(liquidityParsed).div(totalSupply).mul(99).div(100); 
    
            const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
    
            console.log(`Removing liquidity: ${liquidityParsed.toString()} LP tokens for ${tokenA}-${tokenB}`);
            console.log(`Minimum amounts: ${ethers.utils.formatUnits(amountMinA, 18)} ${tokenA}, ${ethers.utils.formatUnits(amountMinB, 18)} ${tokenB}`);
    
            const tx = await router.removeLiquidity(
                tokenAddressA,
                tokenAddressB,
                liquidityParsed,
                amountMinA,
                amountMinB,
                account,
                deadline
            );
            await tx.wait();
            console.log(`Removed liquidity: ${liquidityParsed.toString()} ${tokenA}-${tokenB} LP Tokens`);
        } catch (err) {
            console.error('Error removing liquidity:', err);
        }
    };
    
    const handleBalanceClickInLP = (e) => {
        const currentBalance = lpBalance;
        setAmountA(currentBalance);
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
        <RemoveLiquidityContainer>
            <h2>Remove Liquidity</h2>
            <RemoveLiquidityInputContainer>
                <select value={tokenA} onChange={(e) => { onTokenSelection(e.target.value, tokenB); if (e.target.value !== "default") checkAllowance(e.target.value, tokenB, setAllowanceLP, setNeedsApprovalLP, amountA);}}>
                    <option value="default" key="default">Select Token A</option>
                    {Object.values(tokens).map((token) => (
                        <option key={token.address} value={token.symbol}>{token.symbol}</option>
                    ))}
                </select>
                {tokenA && (
                    <TokenInfo>
                        <img src={tokens[getTokenAddress(tokenA)]?.logo} alt="" width="20" />
                        Balance:{balanceA}
                    </TokenInfo>
                )}
            </RemoveLiquidityInputContainer>
            <RemoveLiquidityInputContainer>
                <select value={tokenB} onChange={(e) => { onTokenSelection(tokenA, e.target.value); if (e.target.value !== "default");}}>
                    <option value="default" key="default">Select Token B</option>
                    {Object.values(tokens).map((token) => (
                        <option key={token.address} value={token.symbol}>{token.symbol}</option>
                    ))}
                </select>
                {tokenB && (
                    <TokenInfo>
                        <img src={tokens[getTokenAddress(tokenB)]?.logo} alt="" width="20" />
                        Balance: {balanceB}
                    </TokenInfo>
                )}
            <br></br>
            <input
                    type="number"
                    placeholder="Amount A"
                    value={amountA}
                    onChange={(e) => handleAmountAChange(e.target.value)}
                    min={0}
                    max={lpBalance}
                />
            </RemoveLiquidityInputContainer>
            {noLiquidity && (
                <NoLiquidityMessage>No Pair Found! Create your own</NoLiquidityMessage>
            )}
            {error && (
                <ErrorMessage>{error}</ErrorMessage>
            )}
            <LPTokenBalance>
                LP Token Balance: <a><span onClick={handleBalanceClickInLP} id={`balance-${tokenA,tokenB}`}> {lpBalance}</span></a>
            </LPTokenBalance>
            <ExchangeRate>
                Exchange Rate: 1 {tokenA} = {exchangeRate} {tokenB}
            </ExchangeRate>
            {renderButton()}
        </RemoveLiquidityContainer>
    );
};

export default RemoveLiquidityTokens;
