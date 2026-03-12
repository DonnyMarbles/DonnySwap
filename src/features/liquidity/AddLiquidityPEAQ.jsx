import { parseUnits } from 'viem';
import {
  AddLiquidityContainer,
  AddLiquidityButton,
  LPTokenBalance,
  ExchangeRate,
  NoLiquidityMessage,
  ErrorMessage,
} from '../../styles/AddLiquidityStyles';
import { executeContractWrite, getFeeData } from '../../lib/viemHelpers';
import { useAlerts } from '../../components/common/AlertProvider';
import { buildExplorerTxUrl } from '../../lib/explorer';

const AddLiquidityPEAQ = ({
  amountA,
  amountB,
  tokenA,
  tokenB,
  publicClient,
  walletClient,
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
  error,
  account,
}) => {
  const { pushAlert } = useAlerts();
  const getDisplaySymbol = (tokenKey) => tokens[tokenKey]?.symbol || tokenKey;
  const hasValidPair = tokenA && tokenB && tokenA !== 'default' && tokenB !== 'default';
  const exchangeRateDisplay =
    hasValidPair && typeof exchangeRate === 'number' && Number.isFinite(exchangeRate)
      ? parseFloat(exchangeRate).toFixed(6)
      : null;

  const handleApprove = async (tokenSymbol, amount) => {
    try {
      if (!walletClient || !publicClient || !account) {
        pushAlert({
          variant: 'error',
          message: 'Please connect your wallet to approve tokens.',
        });
        return;
      }
      if (tokenSymbol === 'PEAQ'){
        return;
      }
      const decimals = getTokenDecimals(tokenSymbol);
      const amountParsed = parseUnits(amount.toString(), decimals);
      const tokenAddress = getTokenAddress(tokenSymbol);
      if (!tokenAddress) throw new Error(`Token address for ${tokenSymbol} not found`);
      console.log(`Approving ${amountParsed.toString()} of ${tokenSymbol}`);
      const receipt = await executeContractWrite({
        publicClient,
        walletClient,
        account,
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [routerAddress, amountParsed],
      });
      if (tokenSymbol === tokenA) {
        setAllowanceA(amountParsed);
        setNeedsApprovalA(false);
      } else {
        setAllowanceB(amountParsed);
        setNeedsApprovalB(false);
      }
      pushAlert({
        variant: 'approval',
        message: `${getDisplaySymbol(tokenSymbol)} approval confirmed.`,
        link: buildExplorerTxUrl(receipt?.transactionHash),
        linkLabel: 'Approved',
      });
    } catch (err) {
      console.error('Error approving token:', err);
      pushAlert({
        variant: 'error',
        message: err?.message || 'Error approving token.',
      });
    }
  };

  const handleAddLiquidity = async () => {
    if (error) {
      return;
    }

    try {
      if (!walletClient || !publicClient || !account) {
        pushAlert({
          variant: 'error',
          message: 'Please connect your wallet to add liquidity.',
        });
        return;
      }
      const isTokenAPEAQ = tokenA === 'PEAQ';
      const pairedToken = isTokenAPEAQ ? tokenB : tokenA;
      const tokenDecimals = getTokenDecimals(pairedToken);
      const tokenAmountDesired = parseUnits(
        (isTokenAPEAQ ? amountB : amountA).toString(),
        tokenDecimals
      );
      const ethAmountDesired = parseUnits(
        (isTokenAPEAQ ? amountA : amountB).toString(),
        18
      );
      const tokenAddress = getTokenAddress(pairedToken);
      if (!tokenAddress) throw new Error(`Token address for ${pairedToken} not found`);
      const feeData = await getFeeData(publicClient);

      const receipt = await executeContractWrite({
        publicClient,
        walletClient,
        account,
        address: routerAddress,
        abi: UniswapV2Router02ABI,
        functionName: 'addLiquidityETH',
        args: [
          tokenAddress,
          tokenAmountDesired,
          0n,
          0n,
          account,
          BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
        ],
        value: ethAmountDesired,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });

      pushAlert({
        variant: 'liquidityAdd',
        message: `${getDisplaySymbol(tokenA)}-${getDisplaySymbol(tokenB)} liquidity added successfully.`,
        link: buildExplorerTxUrl(receipt?.transactionHash),
        linkLabel: 'Liquidity Added',
      });
    } catch (err) {
      console.error('Error adding liquidity:', err);
      pushAlert({
        variant: 'error',
        message: err?.message || 'Error adding liquidity.',
      });
    }
  };

  const renderButton = () => {
    if (needsApprovalA && tokenA) {
      console.log(`Needs approval for tokenA: ${tokenA}`);
      return (
        <AddLiquidityButton onClick={() => handleApprove(tokenA, amountA)} disabled={!!error || !tokenA || !amountA || !walletClient}>
          Approve {tokens[getTokenAddress(tokenA)]?.symbol}
        </AddLiquidityButton>
      );
    }
    if (needsApprovalB && tokenB) {
      console.log(`Needs approval for tokenB: ${tokenB}`);
      return (
        <AddLiquidityButton onClick={() => handleApprove(tokenB, amountB)} disabled={!!error || !tokenB || !amountB || !walletClient}>
          Approve {tokens[getTokenAddress(tokenB)]?.symbol}
        </AddLiquidityButton>
      );
    }
    return (
      <AddLiquidityButton onClick={handleAddLiquidity} disabled={!!error || !tokenA || !tokenB || !amountA || !amountB || !walletClient}>
        Add Liquidity
      </AddLiquidityButton>
    );
  };

  return (
    <AddLiquidityContainer>
      {hasValidPair && (
        <LPTokenBalance>
          LP Token Balance: {lpBalance}
        </LPTokenBalance>
      )}
      {hasValidPair && exchangeRateDisplay && (
        <ExchangeRate>
          Exchange Rate: 1 <img src={tokens[tokenA]?.logo} alt={tokens[tokenA]?.symbol} width="20" /> {tokens[tokenA]?.symbol} = {exchangeRateDisplay}{' '}
          <img src={tokens[tokenB]?.logo} alt={tokens[tokenB]?.symbol} width="20" /> {tokens[tokenB]?.symbol}
        </ExchangeRate>
      )}
      {renderButton()}
      {noLiquidity && hasValidPair && (
        <NoLiquidityMessage>No Pair Found! Create your own</NoLiquidityMessage>
      )}
      {hasValidPair && error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
    </AddLiquidityContainer>
  );
};

export default AddLiquidityPEAQ;
