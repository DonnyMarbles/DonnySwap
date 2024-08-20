import React, { useState, useContext, useEffect } from 'react';
import RemoveLiquidityTokens from './RemoveLiquidityTokens';
import RemoveLiquidityKRST from './RemoveLiquidityKRST';
import { ethers } from 'ethers';
import { Web3Context } from '../contexts/Web3Context';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import {
  RemoveLiquidityContainer,
  RemoveLiquidityInputContainer,
  TokenInfo,
  NoLiquidityMessage,
} from '../styles/RemoveLiquidityStyles';

const RemoveLiquidity = () => {
  const { provider, account, signer } = useContext(Web3Context);
  const { tokens, routerAddress } = useContext(TokenContext);
  const { UniswapV2Router02ABI, UniswapV2PairABI, UniswapV2FactoryABI, ERC20ABI, WrappedKRESTABI } = useContext(ABIContext);
  const [tokenA, setTokenIn] = useState('');
  const [tokenB, setTokenOut] = useState('');
  const [amountA, setAmountA] = useState('0.');
  const [amountB, setAmountB] = useState('0.');
  const [lpBalance, setLpBalance] = useState('0.');
  const [balanceA, setBalanceA] = useState('0.');
  const [balanceB, setBalanceB] = useState('0.');
  const [noLiquidity, setNoLiquidity] = useState(false);
  const [allowanceA, setAllowanceA] = useState(ethers.constants.Zero);
  const [allowanceB, setAllowanceB] = useState(ethers.constants.Zero);
  const [needsApprovalLP, setNeedsApprovalLP] = useState(false);
  const [allowanceLP, setAllowanceLP] = useState(ethers.constants.Zero);
  const [needsApprovalA, setNeedsApprovalA] = useState(false);
  const [needsApprovalB, setNeedsApprovalB] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [blockNumber, setBlockNumber] = useState(0);
  const [error, setError] = useState('');

  const handleTokenSelection = (selectedTokenA, selectedTokenB) => {
    setTokenIn(selectedTokenA);
    setTokenOut(selectedTokenB);

    if (selectedTokenA === selectedTokenB ||
      (selectedTokenA === 'KRST' && selectedTokenB === '0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc') ||
      (selectedTokenA === '0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc' && selectedTokenB === 'KRST')) {
      setError('Invalid token pair selected.');
    } else {
      setError('');
    }
  };
  useEffect(() => {
    if (tokenA && account && tokenA !== "") {
      checkBalance(tokenA, setBalanceA);
    }
    if (tokenB && account && tokenB !== "") {
      checkBalance(tokenB, setBalanceB);
    }
  }, [tokenA, tokenB, account]);

  useEffect(() => {
    if (provider) {
      const updateBlockNumber = async () => {
        const blockNumber = await provider.getBlockNumber();
        setBlockNumber(blockNumber);
      };

      const interval = setInterval(updateBlockNumber, 500); // Increase interval to reduce updates
      return () => clearInterval(interval);
    }
  }, [provider]);

  useEffect(() => {
    if (tokenA && tokenB && account && amountA >= 0) {
      const executeChecks = async () => {
        await checkLPTokenBalance(tokenA, tokenB);
        await checkAllowance(tokenA, tokenB, setAllowanceLP, setNeedsApprovalLP, amountA);
        calculateExchangeRate(tokenA, tokenB);
      };
      executeChecks();
    }
  }, [tokenA, tokenB, account, blockNumber, amountA]);

  useEffect(() => {
    if (amountA >= 0 && tokenA && tokenB) {
      checkIfNeedsApproval(tokenA, tokenB, amountA, allowanceLP, setNeedsApprovalLP);
    }
  }, [amountA, tokenA, tokenB, blockNumber, allowanceLP, allowanceB]);



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


  const checkIfNeedsApproval = async (tokenSymbolA, tokenSymbolB, amount, allowance, setNeedsApprovalLP) => {
    if (tokenSymbolA === "default" || tokenSymbolB === "default") {
      return; // Skip check if tokens are not selected
    }

    // Replace KRST with WKREST
    const adjustedTokenSymbolA = tokenSymbolA === "KRST" ? "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc" : tokenSymbolA;
    const adjustedTokenSymbolB = tokenSymbolB === "KRST" ? "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc" : tokenSymbolB;

    const pairAddress = await getPairAddress(getTokenAddress(adjustedTokenSymbolA), getTokenAddress(adjustedTokenSymbolB));
    if (!pairAddress || pairAddress === ethers.constants.AddressZero) {
      console.error(`Pair address not found for ${adjustedTokenSymbolA}-${adjustedTokenSymbolB}`);
      setNeedsApprovalLP(true);
      return;
    }

    try {
      const amountParsed = ethers.utils.parseUnits(amount.toString(), 18);
      console.log(`Amount parsed for LP tokens of ${adjustedTokenSymbolA}-${adjustedTokenSymbolB}: ${amountParsed}, Allowance: ${allowance}`);
      setNeedsApprovalLP(amountParsed.gt(allowance));
    } catch (err) {
      console.error(`Error parsing amount for LP tokens of ${adjustedTokenSymbolA}-${adjustedTokenSymbolB}:`, err);
      setNeedsApprovalLP(true);
    }
  };

  const checkAllowance = async (tokenSymbolA, tokenSymbolB, setAllowance, setNeedsApprovalLP, amount) => {
    console.log(`Checking allowance for ${tokenSymbolA}-${tokenSymbolB}`);
    try {
      if (amount === 0) {
        console.log('Amount is zero, skipping check');
        return;
      }
      const wrappedKRESTAddress = '0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc';
      const tokenAddressA = tokenSymbolA === 'KRST' ? wrappedKRESTAddress : getTokenAddress(tokenSymbolA);
      const tokenAddressB = tokenSymbolB === 'KRST' ? wrappedKRESTAddress : getTokenAddress(tokenSymbolB);

      console.log(`Addresses: ${tokenAddressA}, ${tokenAddressB}`);      
        const pairAddress = await getPairAddress(tokenAddressA, tokenAddressB);
        console.log(`Pair Address: ${pairAddress}`);

        const lpTokenContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
        const allowance = await lpTokenContract.allowance(account, routerAddress);
        setAllowance(allowance);

        console.log(`Allowance for LP ${tokenSymbolA}-${tokenSymbolB}: ${allowance.toString()}`);
        checkIfNeedsApproval(tokenSymbolA, tokenSymbolB, amount, allowance, setNeedsApprovalLP);
      
    } catch (err) {
      console.error('Error fetching allowance:', err);
      setAllowance(ethers.constants.Zero);
      setNeedsApprovalLP(true);
    }
  };


  const getTokenAddress = (tokenSymbol) => {
    if (tokenSymbol === 'KRST') return null; // KRST is native token, no contract address
    const token = Object.keys(tokens).find(key => tokens[key].address === tokenSymbol);
    console.log(`Retrieved address for ${tokenSymbol}: ${token ? tokens[token].address : null}`);
    return token ? tokens[token].address : null;
  };
  const checkLPTokenBalance = async (tokenSymbolA, tokenSymbolB) => {
    try {
      // Substitute KRST with Wrapped KREST address
      const wrappedKRESTAddress = '0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'; // Replace with actual WKREST address

      const tokenAddressA = tokenSymbolA === 'KRST' ? wrappedKRESTAddress : getTokenAddress(tokenSymbolA);
      const tokenAddressB = tokenSymbolB === 'KRST' ? wrappedKRESTAddress : getTokenAddress(tokenSymbolB);

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
      const wrappedKrestAddress = "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc";

      // Resolve token addresses, using WKREST if KRST is involved
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

      // Calculate rate based on tokenA to tokenB
      const rate = reserveA.gt(0)
        ? ethers.utils.formatUnits(reserveB, getTokenDecimals(tokenSymbolB === 'KRST' ? 'WKREST' : tokenSymbolB))
        / ethers.utils.formatUnits(reserveA, getTokenDecimals(tokenSymbolA === 'KRST' ? 'WKREST' : tokenSymbolA))
        : "0";
      setExchangeRate(rate);
    } catch (err) {
      console.error('Error calculating exchange rate:', err);
      setExchangeRate(null);
    }
  };
  const getPairAddress = async (tokenSymbolA, tokenSymbolB) => {
    // Handle cases where KRST and WKREST are paired together or tokenA equals tokenB
    const wrappedKrestAddress = "0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc";
    const tokenAddressA = tokenSymbolA === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenSymbolA);
    const tokenAddressB = tokenSymbolB === 'KRST' ? wrappedKrestAddress : getTokenAddress(tokenSymbolB);
    if (
      (tokenSymbolA === 'KRST' && tokenSymbolB === '0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc') ||
      (tokenSymbolA === '0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc' && tokenSymbolB === 'KRST') ||
      (tokenSymbolA === tokenSymbolB)
    ) {
      return ethers.constants.AddressZero;
    }

    // Resolve token addresses, using WKREST if KRST is involved
    if (!tokenAddressA || !tokenAddressB) {
      throw new Error(`Token address not found for pair ${tokenSymbolA}-${tokenSymbolB}`);
    }

    const factoryAddress = '0x23aAC8C182b2C2a2387868ee98C1544bF705c097';
    const factoryContract = new ethers.Contract(factoryAddress, UniswapV2FactoryABI, provider);

    // Get and return the pair address
    return await factoryContract.getPair(tokenAddressA, tokenAddressB);
  };
  const handleBalanceClickIn = () => {
    const currentBalance = parseFloat(lpBalance); // Ensure the balance is treated as a number
    setAmountA(currentBalance);
    handleAmountAChange(currentBalance); // Pass the numeric balance to the handler
  };
  
  const handleAmountAChange = (value) => {
    const numValue = parseFloat(value); // Convert the input string to a numeric value
    if (!isNaN(numValue)) {
      setAmountA(numValue); // Set the numeric value in the state
  
      // Check if approval is needed for the token
      if (tokenA && tokenA !== "default") {
        checkIfNeedsApproval(tokenA, tokenB, numValue, allowanceA, setNeedsApprovalA);
      }
  
      // Calculate and set the corresponding amount for token B
      if (exchangeRate && numValue) {
        const newAmountB = numValue * exchangeRate;
        setAmountB(newAmountB);
      }
    } else {
      setAmountA('0.'); // If the input is not a valid number, set the amount to 0
    }
  };
  
  const handleTokenInChange = async (e) => {
    const newTokenIn = e.target.value;
    if (newTokenIn !== null && tokenB !== null) {
      setTokenIn(newTokenIn);
      if (newTokenIn === tokenB) {
        setTokenOut(tokenA); // Swap values if they are the same
      }
      await checkBalance(newTokenIn, setBalanceA);
    }
  };

  const handleTokenOutChange = async (e) => {
    const newTokenOut = e.target.value;
    if (newTokenOut !== null && tokenA !== null) {
    setTokenOut(newTokenOut);
    if (newTokenOut === tokenA) {
      setTokenIn(tokenB); // Swap values if they are the same
    }
    await checkBalance(newTokenOut, setBalanceB);
    }
  };

  const getTokenDecimals = (tokenSymbol) => {
    if (tokenSymbol === 'KRST') return 18; // KRST is native token, use 18 decimals
    const token = Object.keys(tokens).find(key => tokens[key].decimals === tokenSymbol);
    return token ? tokens[token].decimals : 18;
  };
  if (!provider || !signer) {
    return <div>Loading...</div>;
  }

  const isKRSTPair = tokenA === 'KRST' || tokenB === 'KRST';

  return (
    <RemoveLiquidityContainer>
      <h2>Remove Liquidity</h2>
      <RemoveLiquidityInputContainer>
        <select value={tokenA} id={`tokenDropdownA-${tokenA}`} onChange={handleTokenInChange}>
          <option value="default">Select Token In</option>
          {Object.keys(tokens).map(key => (
            <option key={key} value={key}>{tokens[key].symbol}</option>
          ))}
        </select>
        {tokenA && tokens[tokenA] && (
          <TokenInfo>
            <img src={tokens[tokenA].logo} alt="Token Logo" width="20" />
            Balance:<span id={`balance-${tokenA}`}> {balanceA}</span>
          </TokenInfo>
        )}
        <br/>
        <select value={tokenB} id={`tokenDropdownB-${tokenB}`} onChange={handleTokenOutChange}>
          <option value="default">Select Token Out</option>
          {Object.keys(tokens).map(key => (
            <option key={key} value={key}>{tokens[key].symbol}</option>
          ))}
        </select>
        {tokenB && tokens[tokenB] && (
          <TokenInfo>
            <img src={tokens[tokenB].logo} alt="Token Logo" width="20" />
            Balance:<span id={`balance-${tokenB}`}>{balanceB}</span>
          </TokenInfo>
        )}
        </RemoveLiquidityInputContainer>
        <br/>
        <RemoveLiquidityInputContainer>
          LP Tokens to Remove:
          <input
          type="text" 
          inputMode="decimal"
          placeholder="Amount A"
          value={amountA}
          onChange={(e) => handleAmountAChange(e.target.value)}
          min="0.0"
          max={lpBalance}
        />
      </RemoveLiquidityInputContainer>
      {noLiquidity && (
        <NoLiquidityMessage>No Pair Found!</NoLiquidityMessage>
      )}
      {isKRSTPair ? (
        <RemoveLiquidityKRST
          provider={provider}
          amountA={amountA}
          amountB={amountB}
          tokenA={tokenA}
          tokenB={tokenB}
          signer={signer}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          UniswapV2FactoryABI={UniswapV2FactoryABI}
          UniswapV2PairABI={UniswapV2PairABI}
          account={account}
          tokens={tokens}
          exchangeRate={exchangeRate}
          getPairAddress={getPairAddress}
          getTokenDecimals={getTokenDecimals}
          getTokenAddress={getTokenAddress}
          needsApprovalA={needsApprovalA}
          noLiquidity={noLiquidity}
          needsApprovalB={needsApprovalB}
          setAllowanceA={setAllowanceA}
          setAllowanceB={setAllowanceB}
          onTokenSelection={handleTokenSelection}
          checkIfNeedsApproval={checkIfNeedsApproval}
          lpBalance={lpBalance}
          error={error}
          needsApprovalLP={needsApprovalLP}
          setNeedsApprovalLP={setNeedsApprovalLP}
          allowanceLP={allowanceLP}
          setAllowanceLP={setAllowanceLP}
          handleBalanceClickIn={handleBalanceClickIn}
        />
      ) : (
        <RemoveLiquidityTokens
          provider={provider}
          amountA={amountA}
          amountB={amountB}
          tokenA={tokenA}
          tokenB={tokenB}
          signer={signer}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          UniswapV2FactoryABI={UniswapV2FactoryABI}
          UniswapV2PairABI={UniswapV2PairABI}
          account={account}
          tokens={tokens}
          exchangeRate={exchangeRate}
          getTokenDecimals={getTokenDecimals}
          getPairAddress={getPairAddress}
          getTokenAddress={getTokenAddress}
          setNeedsApprovalA={setNeedsApprovalA}
          setNeedsApprovalB={setNeedsApprovalB}
          needsApprovalA={needsApprovalA}
          noLiquidity={noLiquidity}
          needsApprovalB={needsApprovalB}
          setAllowanceA={setAllowanceA}
          allowanceA={allowanceA}
          allowanceB={allowanceB}
          onTokenSelection={handleTokenSelection}
          checkIfNeedsApproval={checkIfNeedsApproval}
          lpBalance={lpBalance}
          error={error}
          needsApprovalLP={needsApprovalLP}
          setNeedsApprovalLP={setNeedsApprovalLP}
          allowanceLP={allowanceLP}
          setAllowanceLP={setAllowanceLP}
          handleBalanceClickIn={handleBalanceClickIn}
        />
      )}
    </RemoveLiquidityContainer>
  );
};

export default RemoveLiquidity;
