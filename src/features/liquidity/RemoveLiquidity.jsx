import { useState, useEffect, useMemo } from 'react';
import { formatUnits, parseUnits } from 'viem';
import RemoveLiquidityTokens from './RemoveLiquidityTokens';
import RemoveLiquidityPEAQ from './RemoveLiquidityPEAQ';
import { useTokens } from '../../contexts/TokenContext';
import { useABI } from '../../contexts/ABIContext';
import { useWallet } from '../../contexts/WalletContext';
import { ZERO_ADDRESS } from '../../lib/viemHelpers';
import useBlockNumberPolling from '../../hooks/useBlockNumberPolling';
import {
  RemoveLiquidityContainer,
  RemoveLiquidityInputContainer,
  TokenInfo,
  NoLiquidityMessage,
} from '../../styles/RemoveLiquidityStyles';
import { FACTORY_ADDRESS, WRAPPED_PEAQ_ADDRESS } from '../../constants/contracts';
import TokenDropdown from '../../components/common/TokenDropdown';

const RemoveLiquidity = () => {
  const { publicClient, walletClient, address: account } = useWallet();

  const { tokens, routerAddress } = useTokens();
  const { UniswapV2Router02ABI, UniswapV2PairABI, UniswapV2FactoryABI, ERC20ABI } = useABI();

  const [tokenA, setTokenIn] = useState('');
  const [tokenB, setTokenOut] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lpBalance, setLpBalance] = useState('0.');
  const [balanceA, setBalanceA] = useState('0.');
  const [balanceB, setBalanceB] = useState('0.');
  const [noLiquidity, setNoLiquidity] = useState(false);
  const [allowanceA, setAllowanceA] = useState(0n);
  const [allowanceB, setAllowanceB] = useState(0n);
  const [needsApprovalLP, setNeedsApprovalLP] = useState(false);
  const [allowanceLP, setAllowanceLP] = useState(0n);
  const [needsApprovalA, setNeedsApprovalA] = useState(false);
  const [needsApprovalB, setNeedsApprovalB] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const blockNumber = useBlockNumberPolling(publicClient);
  const [error, setError] = useState('');

  const handleTokenSelection = (selectedTokenA, selectedTokenB) => {
    setTokenIn(selectedTokenA);
    setTokenOut(selectedTokenB);

    if (selectedTokenA === selectedTokenB ||
      (selectedTokenA === 'PEAQ' && selectedTokenB === WRAPPED_PEAQ_ADDRESS) ||
      (selectedTokenA === WRAPPED_PEAQ_ADDRESS && selectedTokenB === 'PEAQ')) {
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

  function toFixedDown(value, decimals) {
    return (Math.floor(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
  }

  const checkBalance = async (tokenSymbol, setBalance) => {
    try {
      let balance;
      if (!publicClient || !account) return;
      if (tokenSymbol === 'PEAQ') {
        balance = await publicClient.getBalance({ address: account });
      } else {
        const tokenAddress = tokens[tokenSymbol]?.address;
        if (!tokenAddress) return;
        balance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [account],
        });
      }
      const formattedBalance = formatUnits(balance, 18);
      setBalance(toFixedDown(parseFloat(formattedBalance), 8));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0'); // Fallback to 0 in case of an error
    }
  };

  const checkIfNeedsApproval = async (tokenSymbolA, tokenSymbolB, amount, allowance, setNeedsApprovalLP) => {
    if (tokenSymbolA === "default" || tokenSymbolB === "default" || amount === "" || amount === 0) {
      return; // Skip check if tokens are not selected
    }

    const pairAddress = await getPairAddress(tokenSymbolA, tokenSymbolB);
    if (!pairAddress || pairAddress === ZERO_ADDRESS) {
      console.error(`Pair address not found for ${tokenSymbolA}-${tokenSymbolB}`);
      setNeedsApprovalLP(true);
      return;
    }
    const decimals = 18;
    try {

      const amountToCheck = parseFloat(amount);
      const amountParsed = parseUnits(amountToCheck.toString(), decimals);
      setNeedsApprovalLP(amountParsed > allowance);
    } catch (err) {
      console.error(`Error parsing amount for LP tokens of ${tokenSymbolA}-${tokenSymbolB}:`, err);
      setNeedsApprovalLP(true);
    }
  };

  const checkAllowance = async (tokenSymbolA, tokenSymbolB, setAllowance, setNeedsApprovalLP, amount) => {
    try {
      if (amount === 0) return;
      if (!publicClient || !account) return;

      const pairAddress = await getPairAddress(tokenSymbolA, tokenSymbolB);
      if (!pairAddress || pairAddress === ZERO_ADDRESS) {
        setAllowance(0n);
        setNeedsApprovalLP(true);
        return;
      }

      const allowance = await publicClient.readContract({
        address: pairAddress,
        abi: UniswapV2PairABI,
        functionName: 'allowance',
        args: [account, routerAddress],
      });
      setAllowance(allowance);
      checkIfNeedsApproval(tokenSymbolA, tokenSymbolB, amount, allowance, setNeedsApprovalLP);
      
    } catch (err) {
      console.error('Error fetching allowance:', err);
      setAllowance(0n);
      setNeedsApprovalLP(true);
    }
  };

  const getTokenAddress = (tokenSymbol) => {
    if (!tokenSymbol || tokenSymbol === 'default') return null;
    const token = tokens[tokenSymbol];
    return token ? token.address : null;
  };

  const checkLPTokenBalance = async (tokenSymbolA, tokenSymbolB) => {
    try {
      const pairAddress = await getPairAddress(tokenSymbolA, tokenSymbolB);
      if (!pairAddress || pairAddress === ZERO_ADDRESS) {
        setNoLiquidity(true);
        return;
      }

      const balance = await publicClient.readContract({
        address: pairAddress,
        abi: UniswapV2PairABI,
        functionName: 'balanceOf',
        args: [account],
      });
      setLpBalance(toFixedDown(parseFloat(formatUnits(balance, 18)), 8));
      setNoLiquidity(false);
    } catch (err) {
      console.error('Error fetching LP token balance:', err);
      setNoLiquidity(false);
    }
  };

  const calculateExchangeRate = async (tokenSymbolA, tokenSymbolB) => {
    try {
      if (!publicClient) return;
      const tokenAddressA = tokenSymbolA === 'PEAQ' ? WRAPPED_PEAQ_ADDRESS : getTokenAddress(tokenSymbolA);

      const pairAddress = await getPairAddress(tokenSymbolA, tokenSymbolB);
      if (!pairAddress || pairAddress === ZERO_ADDRESS) {
        setExchangeRate(null);
        return;
      }

      const [reserves, token0] = await Promise.all([
        publicClient.readContract({
          address: pairAddress,
          abi: UniswapV2PairABI,
          functionName: 'getReserves',
        }),
        publicClient.readContract({
          address: pairAddress,
          abi: UniswapV2PairABI,
          functionName: 'token0',
        }),
      ]);

      let reserveA, reserveB;

      if (tokenAddressA?.toLowerCase() === token0.toLowerCase()) {
        reserveA = reserves[0];
        reserveB = reserves[1];
      } else {
        reserveA = reserves[1];
        reserveB = reserves[0];
      }

      // Calculate rate based on tokenA to tokenB
      const decimalsB = getTokenDecimals(tokenSymbolB);
      const decimalsA = getTokenDecimals(tokenSymbolA);
      const rate =
        reserveA > 0n
          ? parseFloat(formatUnits(reserveB, decimalsB)) /
            parseFloat(formatUnits(reserveA, decimalsA))
          : 0;
      setExchangeRate(rate);
    } catch (err) {
      console.error('Error calculating exchange rate:', err);
      setExchangeRate(null);
    }
  };

  const getPairAddress = async (tokenSymbolA, tokenSymbolB) => {
    // Handle cases where PEAQ and WPEAQ are paired together or tokenA equals tokenB
    if (!publicClient) return ZERO_ADDRESS;
    const tokenAddressA = tokenSymbolA === 'PEAQ' ? WRAPPED_PEAQ_ADDRESS : getTokenAddress(tokenSymbolA);
    const tokenAddressB = tokenSymbolB === 'PEAQ' ? WRAPPED_PEAQ_ADDRESS : getTokenAddress(tokenSymbolB);
    if (
      (tokenSymbolA === 'PEAQ' && tokenSymbolB === WRAPPED_PEAQ_ADDRESS) ||
      (tokenSymbolA === WRAPPED_PEAQ_ADDRESS && tokenSymbolB === 'PEAQ') ||
      (tokenSymbolA === tokenSymbolB)
    ) {
      return ZERO_ADDRESS;
    }

    // Resolve token addresses, using WPEAQ if PEAQ is involved
    if (!tokenAddressA || !tokenAddressB) {
      throw new Error(`Token address not found for pair ${tokenSymbolA}-${tokenSymbolB}`);
    }

    return await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: UniswapV2FactoryABI,
      functionName: 'getPair',
      args: [tokenAddressA, tokenAddressB],
    });
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
  
  const handleTokenInChange = async (nextTokenKey) => {
    if (!nextTokenKey) return;
    const previousTokenA = tokenA;
    setTokenIn(nextTokenKey);

    if (nextTokenKey === tokenB) {
      setTokenOut(previousTokenA || 'default');
    }

    if (nextTokenKey === 'default') {
      setBalanceA('0.');
      return;
    }

    await checkBalance(nextTokenKey, setBalanceA);
  };

  const handleTokenOutChange = async (nextTokenKey) => {
    if (!nextTokenKey) return;
    const previousTokenB = tokenB;
    setTokenOut(nextTokenKey);

    if (nextTokenKey === tokenA) {
      setTokenIn(previousTokenB || 'default');
    }

    if (nextTokenKey === 'default') {
      setBalanceB('0.');
      return;
    }

    await checkBalance(nextTokenKey, setBalanceB);
  };

  const getTokenDecimals = (tokenSymbol) => {
    if (!tokenSymbol || tokenSymbol === 'default') return 18;
    return tokens[tokenSymbol]?.decimals ?? 18;
  };

  const isPEAQPair = tokenA === 'PEAQ' || tokenB === 'PEAQ';
  const tokenOptions = useMemo(() => Object.keys(tokens || {}), [tokens]);

  return (
    <RemoveLiquidityContainer>
      <h2>Remove Liquidity</h2>
      <RemoveLiquidityInputContainer>
        <TokenDropdown
          id={`remove-liquidity-token-a-${tokenA}`}
          value={tokenA}
          onChange={handleTokenInChange}
          tokens={tokens}
          options={tokenOptions}
          placeholder="Select Token In"
        />
        {tokenA && tokens[tokenA] && (
          <TokenInfo>
            <img src={tokens[tokenA].logo} alt="Token Logo" width="20" />
            Balance: <span id={`balance-${tokenA}`}>{balanceA}</span>
          </TokenInfo>
        )}
        <TokenDropdown
          id={`remove-liquidity-token-b-${tokenB}`}
          value={tokenB}
          onChange={handleTokenOutChange}
          tokens={tokens}
          options={tokenOptions}
          placeholder="Select Token Out"
        />
        {tokenB && tokens[tokenB] && (
          <TokenInfo>
            <img src={tokens[tokenB].logo} alt="Token Logo" width="20" />
            Balance: <span id={`balance-${tokenB}`}>{balanceB}</span>
          </TokenInfo>
        )}
      </RemoveLiquidityInputContainer>
        <RemoveLiquidityInputContainer>
          <label htmlFor="lp-tokens-to-remove">LP Tokens to Remove</label>
          <input
            id="lp-tokens-to-remove"
            type="number" 
            inputMode="decimal"
            placeholder="Enter amount"
            value={amountA}
            onChange={(e) => handleAmountAChange(e.target.value)}
            min={0}
            max={lpBalance}
          />
      </RemoveLiquidityInputContainer>
      {noLiquidity && (
        <NoLiquidityMessage>No Pair Found!</NoLiquidityMessage>
      )}
      {isPEAQPair ? (
        <RemoveLiquidityPEAQ
          publicClient={publicClient}
          walletClient={walletClient}
          amountA={amountA}
          amountB={amountB}
          tokenA={tokenA}
          tokenB={tokenB}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          account={account}
          UniswapV2FactoryABI={UniswapV2FactoryABI}
          UniswapV2PairABI={UniswapV2PairABI}
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
          publicClient={publicClient}
          walletClient={walletClient}
          amountA={amountA}
          amountB={amountB}
          tokenA={tokenA}
          tokenB={tokenB}
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
