import React, { useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import { Web3Context } from '../contexts/Web3Context';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import {
  SwapContainer,
  SwapInputContainer,
  TokenInfo,
  NoLiquidityMessage,
  SlippageInputContainer,
} from '../styles/SwapStyles';
import WrapUnwrap from './WrapUnwrap';
import SwapTokens from './SwapTokens';
import SwapTokensKRST from './SwapTokensKRST';

const Swap = () => {
  const { provider, account, signer } = useContext(Web3Context);
  const { tokens, routerAddress } = useContext(TokenContext);
  const { UniswapV2Router02ABI, UniswapV2PairABI, UniswapV2FactoryABI, ERC20ABI, WrappedKRESTABI } = useContext(ABIContext);
  const [tokenA, setTokenIn] = useState('');
  const [tokenB, setTokenOut] = useState('');
  const [amountA, setAmountA] = useState(0);
  const [amountB, setAmountB] = useState(0);
  const [balanceA, setBalanceA] = useState(0);
  const [balanceB, setBalanceB] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [noLiquidity, setNoLiquidity] = useState(false);
  const [allowanceA, setAllowanceA] = useState(ethers.constants.Zero);
  const [allowanceB, setAllowanceB] = useState(ethers.constants.Zero);
  const [needsApprovalA, setNeedsApprovalA] = useState(false);
  const [needsApprovalB, setNeedsApprovalB] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [blockNumber, setBlockNumber] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tokenA && account) {
      checkBalance(tokenA, setBalanceA);
      console.log(`Balance A set to: ${balanceA}`);
    }
  }, [tokenA]);
  
  useEffect(() => {
    if (tokenB && account) {
      checkBalance(tokenB, setBalanceB);
      console.log(`Balance B set to: ${balanceB}`);
    }
  }, [tokenB]);
  
  

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
    if (tokenA && account && amountA >= 0) {
      checkBalance(tokenA, setBalanceA);
      checkAllowance(tokenA, setAllowanceA, setNeedsApprovalA, amountA);
    }
    if (tokenB && account && amountB >= 0) {
      checkBalance(tokenB, setBalanceB);
      checkAllowance(tokenB, setAllowanceB, setNeedsApprovalB, amountB);
    }
    if (tokenA && tokenB && account && amountB >= 0) {
      fetchExchangeRate(tokenA, tokenB);
    }
  }, [tokenA, tokenB, amountA, amountB, account, blockNumber]);

  useEffect(() => {
    if (amountA && tokenA && tokenA !== "default") {
      checkIfNeedsApproval(tokenA, amountA, allowanceA, setNeedsApprovalA);
    }
    if (amountB && tokenB && tokenB !== "default") {
      checkIfNeedsApproval(tokenB, amountB, allowanceB, setNeedsApprovalB);
    }
  }, [amountA, amountB, tokenA, tokenB, allowanceA, allowanceB, blockNumber]);

  const checkBalance = async (tokenSymbol, setBalance) => {
    try {
      let balance;
      if (tokenSymbol === 'KRST') {
        balance = await provider.getBalance(account);
      } else {
        const contract = new ethers.Contract(tokens[tokenSymbol].address, ERC20ABI, provider);
        balance = await contract.balanceOf(account);
      }
      const formattedBalance = ethers.utils.formatUnits(balance, 18);
      console.log(`Fetched balance for ${tokenSymbol}:`, formattedBalance); // Debugging log
      setBalance(formattedBalance); // Set the balance in the state
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0'); // Fallback to 0 in case of an error
    }
  };
  const getTokenAddress = (tokenSymbol) => {
    if (tokenSymbol === 'KRST') return null; // KRST is native token, no contract address
    const token = Object.keys(tokens).find(key => tokens[key].address === tokenSymbol);
    console.log(`Retrieved address for ${tokenSymbol}: ${token ? tokens[token].address : null}`);
    return token ? tokens[token].address : null;
  };

  const getTokenDecimals = (tokenSymbol) => {
    if (tokenSymbol === 'KRST') return 18; // KRST is native token, use 18 decimals
    const token = Object.keys(tokens).find(key => tokens[key].decimals === tokenSymbol);
    return token ? tokens[token].decimals : 18;
  };

  const getPairAddress = async (tokenSymbolA, tokenSymbolB) => {
    // Handle cases where KRST and WKREST are paired together or tokenA equals tokenB
    if (
      (tokenSymbolA === 'KRST' && tokenSymbolB === 'WKREST') ||
      (tokenSymbolA === 'WKREST' && tokenSymbolB === 'KRST') ||
      (tokenSymbolA === tokenSymbolB)
    ) {
      return ethers.constants.AddressZero;
    }

    const wrappedKrestAddress = "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc";

    // Resolve token addresses, using WKREST if KRST is involved
    const tokenAddressA = tokenSymbolA === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenSymbolA);
    const tokenAddressB = tokenSymbolB === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenSymbolB);

    if (!tokenAddressA || !tokenAddressB) {
      throw new Error(`Token address not found for pair ${tokenSymbolA}-${tokenSymbolB}`);
    }

    const factoryAddress = '0x23aAC8C182b2C2a2387868ee98C1544bF705c097';
    const factoryContract = new ethers.Contract(factoryAddress, UniswapV2FactoryABI, provider);

    // Get and return the pair address
    return await factoryContract.getPair(tokenAddressA, tokenAddressB);
  };

  const fetchExchangeRate = async (tokenSymbolA, tokenSymbolB) => {
    try {
      // Define the Wrapped KREST address
      const wrappedKrestAddress = "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc";
  
      // Use the Wrapped KREST address if KRST is involved
      const tokenAddressA = tokenSymbolA === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenSymbolA);
      const tokenAddressB = tokenSymbolB === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenSymbolB);
  
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
  
      const rate = reserveA.gt(0) ? ethers.utils.formatUnits(reserveB, getTokenDecimals(tokenSymbolB)) / ethers.utils.formatUnits(reserveA, getTokenDecimals(tokenSymbolA)) : "0";
      setExchangeRate(rate);
    } catch (err) {
      console.error('Error calculating exchange rate:', err);
      setExchangeRate(null);
    }
  };
  

  const checkAllowance = async (tokenSymbol, setAllowance, setNeedsApproval, amount) => {
    try {
      if (amount === 0) {
        return; // Skip check if token is not selected
      }
      const tokenAddress = getTokenAddress(tokenSymbol);
      if (!tokenAddress && tokenSymbol !== 'KRST') {
        throw new Error(`Token address for ${tokenSymbol} not found`);
      }
      if (tokenSymbol === 'KRST') {
        setAllowance(ethers.constants.MaxUint256); // Native token doesn't need allowance
      } else {
        const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
        const allowance = await contract.allowance(account, routerAddress);
        setAllowance(allowance);
        console.log(`Allowance for ${tokenSymbol}: ${allowance.toString()}`);
        checkIfNeedsApproval(tokenSymbol, amount, allowance, setNeedsApproval);
      }
    } catch (err) {
      console.error('Error fetching allowance:', err);
      setAllowance(ethers.constants.Zero);
      setNeedsApproval(true);
    }
  };
  const checkIfNeedsApproval = (tokenSymbol, amount, allowance, setNeedsApproval) => {
    if (tokenSymbol === 'default') return; // Skip check if token is not selected
    try {
      const amountParsed = ethers.utils.parseUnits(amount.toString(), getTokenDecimals(tokenSymbol));
      setNeedsApproval(amountParsed.gt(allowance));
    } catch (err) {
      console.error(`Error parsing amount for ${tokenSymbol}:`, err);
      setNeedsApproval(true);
    }
  };
  const handleTokenInChange = async (e) => {
    const newTokenIn = e.target.value;
    if (newTokenIn !== null && tokenB !== null) {
      setTokenIn(newTokenIn);
      if (newTokenIn === tokenB) {
        setTokenOut(tokenA); // Swap values if they are the same
      }
      checkBalance(newTokenIn, setBalanceA);
    }
  };

  const handleTokenOutChange = async (e) => {
    const newTokenOut = e.target.value;
    if (newTokenOut !== null && tokenA !== null) {
    setTokenOut(newTokenOut);
    if (newTokenOut === tokenA) {
      setTokenIn(tokenB); // Swap values if they are the same
    }
    checkBalance(newTokenOut, setBalanceB);
    }
  };

  const handleBalanceClickIn = () => {
    const currentBalance = parseFloat(balanceA); // Ensure the balance is treated as a number
    setAmountA(currentBalance); // Directly set the balance as the amount
    console.log('handleBalanceClickIn set amountA to:', currentBalance); // Debugging log
    if (exchangeRate && currentBalance) {
      const newAmountB = currentBalance * exchangeRate;
      setAmountB(newAmountB);
    }
  };
  
  const handleBalanceClickOut = () => {
    const currentBalance = parseFloat(balanceB); // Ensure the balance is treated as a number
    setAmountB(currentBalance); // Directly set the balance as the amount
    console.log('handleBalanceClickOut set amountB to:', currentBalance); // Debugging log
    if (exchangeRate && currentBalance) {
      const newAmountA = currentBalance / exchangeRate;
      setAmountA(newAmountA);
    }
  };

  const handleAmountAChange = (value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAmountA(numValue);
      if (tokenA && tokenA !== "default") {
        checkIfNeedsApproval(tokenA, numValue, allowanceA, setNeedsApprovalA);
      }
      if (exchangeRate && numValue) {
        const newAmountA = numValue * exchangeRate;
        setAmountB(newAmountA);
      }
    } else {
      setAmountA(0);
    }
  };

  const handleAmountBChange = (value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAmountB(numValue);
      if (tokenA && tokenB !== "default") {
        checkIfNeedsApproval(tokenB, numValue, allowanceB, setNeedsApprovalB);
      }
      if (exchangeRate && numValue) {
        const newAmountB = numValue / exchangeRate;
        setAmountA(newAmountB);
      }
    } else {
      setAmountB(0);
    }
  };
  
  const isWrapOrUnwrap = (tokenA, tokenB) => (tokenA === 'KRST' && tokenB === tokens['0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'].address) || (tokenA === tokens['0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'].address && tokenB === 'KRST');
  const isKRSTSwap = (tokenA, tokenB) => tokenA === 'KRST' || tokenB === 'KRST';

  if (!provider || !signer) {
    return <div>Loading...</div>;
  }

  return (
    <SwapContainer>
      <h2>Swap Tokens</h2>
      <SwapInputContainer>
        <select value={tokenA} onChange={handleTokenInChange}>
          <option value="default">Select Token In</option>
          {Object.keys(tokens).map(key => (
            <option key={key} value={key}>{tokens[key].symbol}</option>
          ))}
        </select>
        {tokenA && tokens[tokenA] && (
          <TokenInfo>
            <img src={tokens[tokenA].logo} alt="Token Logo" width="20" />
            Balance:<a><span onClick={handleBalanceClickIn} id={`balance-${tokenA}`}> {balanceA}</span></a>
          </TokenInfo>
        )}
        <input
          type="text" 
          inputMode="numeric"
          placeholder="Amount A"
          value={amountA}
          onChange={(e) => handleAmountAChange(e.target.value)}
          min={0}
          max={balanceA}
        />
      </SwapInputContainer>
      <SwapInputContainer>
        <select value={tokenB} onChange={handleTokenOutChange}>
          <option value="default">Select Token Out</option>
          {Object.keys(tokens).map(key => (
            <option key={key} value={key}>{tokens[key].symbol}</option>
          ))}
        </select>
        {tokenB && tokens[tokenB] && (
          <TokenInfo>
            <img src={tokens[tokenB].logo} alt="Token Logo" width="20" />
            Balance:<a><span onClick={handleBalanceClickOut} id={`balance-${tokenB}`}>{balanceB}</span></a>
          </TokenInfo>
        )}
        <input
          type="text" 
          inputMode="numeric"
          placeholder="Amount B"
          value={amountB}
          onChange={(e) => handleAmountBChange(e.target.value)}
          min={0.00}
          max={balanceB}
        />
      </SwapInputContainer>
      {isWrapOrUnwrap(tokenA, tokenB) ? (
        <WrapUnwrap
          tokenA={tokenA}
          tokenB={tokenB}
          amountA={amountA}
          amountB={amountB}
          setAmountB={setAmountB}
          provider={provider}
          WKRESTAddress={tokens['0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'].address}
          WrappedKRESTABI={WrappedKRESTABI}
        />
      ) : isKRSTSwap(tokenA, tokenB) ? (
        <SwapTokensKRST
          provider={provider}
          tokenA={tokenA}
          tokenB={tokenB}
          amountA={amountA}
          amountB={amountB}
          setAmountB={setAmountB}
          slippage={slippage}
          signer={signer}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          UniswapV2PairABI={UniswapV2PairABI}
          UniswapV2FactoryABI={UniswapV2FactoryABI}
          WrappedKRESTABI={WrappedKRESTABI}
          account={account}
          tokens={tokens}
          allowanceA={allowanceA}
          allowanceB={allowanceB}
          setAllowanceA={setAllowanceA}
          checkIfNeedsApproval={checkIfNeedsApproval}
          setNeedsApprovalA={setNeedsApprovalA}
          setNeedsApprovalB={setNeedsApprovalB}
          exchangeRate={exchangeRate}
          getTokenDecimals={getTokenDecimals}
          getTokenAddress={getTokenAddress}
          needsApprovalA={needsApprovalA}
          needsApprovalB={needsApprovalB}
          WKRESTAddress={tokens['0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'].address}
          checkAllowance={checkAllowance}
          error={error}
        />
      ) : (
        <SwapTokens
          provider={provider}
          tokenA={tokenA}
          tokenB={tokenB}
          amountA={amountA}
          amountB={amountB}
          setAmountB={setAmountB}
          slippage={slippage}
          signer={signer}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          UniswapV2PairABI={UniswapV2PairABI}
          UniswapV2FactoryABI={UniswapV2FactoryABI}
          WrappedKRESTABI={WrappedKRESTABI}
          account={account}
          tokens={tokens}
          allowanceA={allowanceA}
          allowanceB={allowanceB}
          setAllowanceA={setAllowanceA}
          checkIfNeedsApproval={checkIfNeedsApproval}
          setNeedsApprovalA={setNeedsApprovalA}
          setNeedsApprovalB={setNeedsApprovalB}
          exchangeRate={exchangeRate}
          getTokenDecimals={getTokenDecimals}
          getTokenAddress={getTokenAddress}
          needsApprovalA={needsApprovalA}
          needsApprovalB={needsApprovalB}
          error={error}
        />
      )}
      <SlippageInputContainer>
        <label htmlFor="slippage">Slippage Tolerance (%)</label>
        <input type="number" id="slippage" value={slippage} onChange={(e) => { setSlippage(e.target.value) }} step="0.1" min="0" max="40" />
      </SlippageInputContainer>
      {noLiquidity && <NoLiquidityMessage>No Liquidity Pool Found</NoLiquidityMessage>}
    </SwapContainer>
  );
};

export default Swap;
