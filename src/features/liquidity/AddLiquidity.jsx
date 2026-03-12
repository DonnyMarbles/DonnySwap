import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import AddLiquidityTokens from './AddLiquidityTokens';
import AddLiquidityPEAQ from './AddLiquidityPEAQ';
import { useTokens } from '../../contexts/TokenContext';
import { useABI } from '../../contexts/ABIContext';
import { usePEAQPrice } from '../../contexts/PEAQPriceContext';
import useTokenPair from '../../hooks/useTokenPair';
import { useWallet } from '../../contexts/WalletContext';
import { ZERO_ADDRESS } from '../../lib/viemHelpers';
import { FACTORY_ADDRESS, WRAPPED_PEAQ_ADDRESS } from '../../constants/contracts';
import {
  AddLiquidityContainer,
  AddLiquidityInputContainer,
  TokenInfo,
  NoLiquidityMessage,
  GreyedOutUSD,
} from '../../styles/AddLiquidityStyles';
import TokenDropdown from '../../components/common/TokenDropdown';

const AddLiquidity = () => {
  const { publicClient, walletClient, address: account } = useWallet();
  const { tokens, routerAddress } = useTokens();
  const { UniswapV2Router02ABI, UniswapV2PairABI, ERC20ABI, UniswapV2FactoryABI } = useABI();
  const { PEAQPrice } = usePEAQPrice();

  const [lpBalance, setLpBalance] = useState('0');

  const { state, setters, actions, helpers } = useTokenPair({
    publicClient,
    account,
    routerAddress,
    tokens,
    ERC20ABI,
    pairABI: UniswapV2PairABI,
    factoryABI: UniswapV2FactoryABI,
    factoryAddress: FACTORY_ADDRESS,
    wrappedTokenAddress: WRAPPED_PEAQ_ADDRESS,
    pricePerNative: PEAQPrice,
    pollInterval: 500,
  });

  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    balanceIn,
    balanceOut,
    balanceInUSD,
    balanceOutUSD,
    allowanceIn,
    allowanceOut,
    needsApprovalIn,
    needsApprovalOut,
    exchangeRate,
    noLiquidity,
    error,
    blockNumber,
  } = state;

  const {
    setNeedsApprovalIn,
    setNeedsApprovalOut,
    setAllowanceIn,
    setAllowanceOut,
    setError,
  } = setters;

  const {
    handleSelectTokenIn,
    handleSelectTokenOut,
    handleAmountInChange,
    handleAmountOutChange,
    handleBalanceClickIn,
    handleBalanceClickOut,
  } = actions;

  const { toFixedDown, tokenOptions, getTokenAddress, getTokenDecimals, getPairAddress } = helpers;

  const tokenA = tokenIn;
  const tokenB = tokenOut;
  const amountA = amountIn;
  const amountB = amountOut;
  const balanceA = balanceIn;
  const balanceB = balanceOut;
  const balanceAUSD = balanceInUSD;
  const balanceBUSD = balanceOutUSD;
  const allowanceA = allowanceIn;
  const allowanceB = allowanceOut;
  const needsApprovalA = needsApprovalIn;
  const needsApprovalB = needsApprovalOut;

  useEffect(() => {
    const invalidPair =
      tokenA &&
      tokenB &&
      (tokenA === tokenB ||
        (tokenA === 'PEAQ' && tokenB === WRAPPED_PEAQ_ADDRESS) ||
        (tokenB === 'PEAQ' && tokenA === WRAPPED_PEAQ_ADDRESS));
    if (invalidPair) {
      setError('Invalid token pair selected.');
    } else {
      setError('');
    }
  }, [tokenA, tokenB, setError]);

  useEffect(() => {
    const fetchLpBalance = async () => {
      if (!publicClient || !account || !tokenA || !tokenB || tokenA === 'default' || tokenB === 'default') {
        setLpBalance('0');
        return;
      }
      try {
        const pairAddress = await getPairAddress(tokenA, tokenB);
        if (!pairAddress || pairAddress === ZERO_ADDRESS) {
          setLpBalance('0');
          return;
        }
        const balance = await publicClient.readContract({
          address: pairAddress,
          abi: UniswapV2PairABI,
          functionName: 'balanceOf',
          args: [account],
        });
        setLpBalance(toFixedDown(parseFloat(formatUnits(balance, 18)), 8));
      } catch (lpErr) {
        console.error('Error fetching LP token balance', lpErr);
        setLpBalance('0');
      }
    };
    fetchLpBalance();
  }, [publicClient, account, tokenA, tokenB, blockNumber, getPairAddress, UniswapV2PairABI, toFixedDown]);

  const isPEAQPair = tokenA === 'PEAQ' || tokenB === 'PEAQ';

  return (
    <AddLiquidityContainer>
      <h2>Add Liquidity</h2>
      <AddLiquidityInputContainer>
        <TokenDropdown
          id={`add-liquidity-token-a-${tokenA}`}
          value={tokenA}
          onChange={handleSelectTokenIn}
          tokens={tokens}
          options={tokenOptions}
          placeholder="Select Token In"
        />
        {tokenA && tokens[tokenA] && (
          <TokenInfo>
            <img src={tokens[tokenA].logo} alt="Token Logo" width="20" />
            Balance:
            <a>
              <span onClick={handleBalanceClickIn} id={`balance-${tokenA}`}>
                {' '}
                <strong>{balanceA}</strong>
              </span>
            </a>
            <GreyedOutUSD> (${toFixedDown(parseFloat(balanceAUSD || 0), 8)} USD)</GreyedOutUSD>
          </TokenInfo>
        )}
        <input
          type="number"
          inputMode="decimal"
          placeholder="Amount A"
          value={amountA}
          onChange={(e) => handleAmountInChange(e.target.value)}
          min={0}
          max={balanceA}
        />
      </AddLiquidityInputContainer>
      <AddLiquidityInputContainer>
        <TokenDropdown
          id={`add-liquidity-token-b-${tokenB}`}
          value={tokenB}
          onChange={handleSelectTokenOut}
          tokens={tokens}
          options={tokenOptions}
          placeholder="Select Token Out"
        />
        {tokenB && tokens[tokenB] && (
          <TokenInfo>
            <img src={tokens[tokenB].logo} alt="Token Logo" width="20" />
            Balance:
            <a>
              <span onClick={handleBalanceClickOut} id={`balance-${tokenB}`}>
                <strong>{balanceB}</strong>
              </span>
            </a>
            <GreyedOutUSD> (${toFixedDown(parseFloat(balanceBUSD || 0), 8)} USD)</GreyedOutUSD>
          </TokenInfo>
        )}
        <input
          type="number"
          inputMode="decimal"
          placeholder="Amount B"
          value={amountB}
          onChange={(e) => handleAmountOutChange(e.target.value)}
          min={0}
          max={balanceB}
        />
      </AddLiquidityInputContainer>
      {noLiquidity && <NoLiquidityMessage>No Pair Found! Create your own</NoLiquidityMessage>}
      {isPEAQPair ? (
        <AddLiquidityPEAQ
          amountA={amountA}
          amountB={amountB}
          tokenA={tokenA}
          tokenB={tokenB}
          publicClient={publicClient}
          walletClient={walletClient}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          account={account}
          tokens={tokens}
          exchangeRate={exchangeRate}
          getTokenDecimals={getTokenDecimals}
          getTokenAddress={getTokenAddress}
          setNeedsApprovalA={setNeedsApprovalIn}
          setNeedsApprovalB={setNeedsApprovalOut}
          needsApprovalA={needsApprovalA}
          needsApprovalB={needsApprovalB}
          noLiquidity={noLiquidity}
          lpBalance={lpBalance}
          setAllowanceA={setAllowanceIn}
          setAllowanceB={setAllowanceOut}
          allowanceA={allowanceA}
          allowanceB={allowanceB}
          error={error}
        />
      ) : (
        <AddLiquidityTokens
          amountA={amountA}
          amountB={amountB}
          tokenA={tokenA}
          tokenB={tokenB}
          publicClient={publicClient}
          walletClient={walletClient}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          account={account}
          tokens={tokens}
          exchangeRate={exchangeRate}
          getTokenDecimals={getTokenDecimals}
          getTokenAddress={getTokenAddress}
          setNeedsApprovalA={setNeedsApprovalIn}
          setNeedsApprovalB={setNeedsApprovalOut}
          needsApprovalA={needsApprovalA}
          needsApprovalB={needsApprovalB}
          noLiquidity={noLiquidity}
          setAllowanceA={setAllowanceIn}
          setAllowanceB={setAllowanceOut}
          allowanceA={allowanceA}
          allowanceB={allowanceB}
          lpBalance={lpBalance}
          error={error}
        />
      )}
    </AddLiquidityContainer>
  );
};

export default AddLiquidity;