import { useState } from 'react';
import { useTokens } from '../../contexts/TokenContext';
import { useABI } from '../../contexts/ABIContext';
import { usePEAQPrice } from '../../contexts/PEAQPriceContext';
import useTokenPair from '../../hooks/useTokenPair';
import { useWallet } from '../../contexts/WalletContext';
import {
  SwapContainer,
  SwapInputContainer,
  TokenInfo,
  NoLiquidityMessage,
  SlippageInputContainer,
  GreyedOutUSD,
} from '../../styles/SwapStyles';
import WrapUnwrap from './WrapUnwrap';
import SwapTokens from './SwapTokens';
import SwapTokensPEAQ from './SwapTokensPEAQ';
import { FACTORY_ADDRESS, WRAPPED_PEAQ_ADDRESS } from '../../constants/contracts';
import TokenDropdown from '../../components/common/TokenDropdown';

const Swap = () => {
  const { publicClient, walletClient, address: account } = useWallet();
  const { tokens, routerAddress } = useTokens();
  const {
    UniswapV2Router02ABI,
    UniswapV2PairABI,
    UniswapV2FactoryABI,
    ERC20ABI,
    WrappedPEAQABI,
  } = useABI();
  const { PEAQPrice } = usePEAQPrice();

  const [slippage, setSlippage] = useState(0.5);

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
    pollInterval: 1000,
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
    needsApprovalIn,
    exchangeRate,
    noLiquidity,
    error,
  } = state;

  const { setAmountOut, setNeedsApprovalIn, setAllowanceIn } = setters;

  const {
    handleSelectTokenIn,
    handleSelectTokenOut,
    handleAmountInChange,
    handleAmountOutChange,
    handleBalanceClickIn,
    handleBalanceClickOut,
  } = actions;

  const { toFixedDown, tokenOptions, getTokenAddress, getTokenDecimals, getTokenUsdPrice } = helpers;

  const tokenA = tokenIn;
  const tokenB = tokenOut;
  const amountA = amountIn;
  const amountB = amountOut;
  const balanceA = balanceIn;
  const balanceB = balanceOut;
  const balanceAUSD = balanceInUSD;
  const balanceBUSD = balanceOutUSD;
  const needsApprovalA = needsApprovalIn;

  const isWrapOrUnwrap = (tokenAValue, tokenBValue) =>
    (tokenAValue === 'PEAQ' && tokenBValue === WRAPPED_PEAQ_ADDRESS) ||
    (tokenAValue === WRAPPED_PEAQ_ADDRESS && tokenBValue === 'PEAQ');

  const isPEAQSwap = (tokenAValue, tokenBValue) =>
    tokenAValue === 'PEAQ' || tokenBValue === 'PEAQ';

  if (!publicClient) {
    return <div>Loading...</div>;
  }

  return (
    <SwapContainer>
      <h2>Swap Tokens</h2>
      <SwapInputContainer>
        <TokenDropdown
          id="swap-token-in"
          value={tokenA}
          onChange={handleSelectTokenIn}
          tokens={tokens}
          options={tokenOptions}
          placeholder="Select Token In"
        />
        {tokenA && tokens[tokenA] && (
          <TokenInfo>
            <img src={tokens[tokenA]?.logo} alt="Token Logo" width="20" />
            Balance:
            <a>
              <span onClick={handleBalanceClickIn} id={`balance-${tokenA}`}>
                {' '}
                {toFixedDown(parseFloat(balanceA || 0), 8)}
              </span>
            </a>
            <GreyedOutUSD> (~${toFixedDown(parseFloat(balanceAUSD || 0), 8)} USD)</GreyedOutUSD>
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
      </SwapInputContainer>
      <SwapInputContainer>
        <TokenDropdown
          id="swap-token-out"
          value={tokenB}
          onChange={handleSelectTokenOut}
          tokens={tokens}
          options={tokenOptions}
          placeholder="Select Token Out"
        />
        {tokenB && tokens[tokenB] && (
          <TokenInfo>
            <img src={tokens[tokenB]?.logo} alt="Token Logo" width="20" />
            Balance:
            <a>
              <span onClick={handleBalanceClickOut} id={`balance-${tokenB}`}>
                {toFixedDown(parseFloat(balanceB || 0), 8)}
              </span>
            </a>
            <GreyedOutUSD> (~${toFixedDown(parseFloat(balanceBUSD || 0), 8)} USD)</GreyedOutUSD>
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
      </SwapInputContainer>
      {isWrapOrUnwrap(tokenA, tokenB) ? (
        <WrapUnwrap
          tokenA={tokenA}
          tokenB={tokenB}
          amountA={amountA}
          amountB={amountB}
          setAmountB={setAmountOut}
          wrappedPEAQAddress={WRAPPED_PEAQ_ADDRESS}
          WrappedPEAQABI={WrappedPEAQABI}
        />
      ) : isPEAQSwap(tokenA, tokenB) ? (
        <SwapTokensPEAQ
          publicClient={publicClient}
          walletClient={walletClient}
          tokenA={tokenA}
          tokenB={tokenB}
          amountA={amountA}
          amountB={amountB}
          setAmountB={setAmountOut}
          slippage={slippage}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          account={account}
          tokens={tokens}
          exchangeRate={exchangeRate || 0}
          getTokenDecimals={getTokenDecimals}
          getTokenAddress={getTokenAddress}
          getTokenUsdPrice={getTokenUsdPrice}
          needsApprovalA={needsApprovalA}
          setAllowanceA={setAllowanceIn}
          error={error}
          setNeedsApprovalA={setNeedsApprovalIn}
        />
      ) : (
        <SwapTokens
          amountA={amountA}
          amountB={amountB}
          setAmountB={setAmountOut}
          slippage={slippage}
          tokenA={tokenA}
          tokenB={tokenB}
          publicClient={publicClient}
          walletClient={walletClient}
          routerAddress={routerAddress}
          ERC20ABI={ERC20ABI}
          UniswapV2Router02ABI={UniswapV2Router02ABI}
          account={account}
          tokens={tokens}
          exchangeRate={exchangeRate || 0}
          getTokenDecimals={getTokenDecimals}
          getTokenAddress={getTokenAddress}
          getTokenUsdPrice={getTokenUsdPrice}
          setNeedsApprovalA={setNeedsApprovalIn}
          needsApprovalA={needsApprovalA}
          setAllowanceA={setAllowanceIn}
          error={error}
        />
      )}
      <SlippageInputContainer>
        <label htmlFor="slippage">Slippage Tolerance (%)</label>
        <input
          type="number"
          id="slippage"
          value={slippage}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setSlippage(Number.isFinite(val) ? val : 0);
          }}
          step="0.1"
          min="0"
          max="40"
        />
      </SlippageInputContainer>
      {noLiquidity && <NoLiquidityMessage>No Liquidity Pool Found</NoLiquidityMessage>}
    </SwapContainer>
  );
};

export default Swap;
