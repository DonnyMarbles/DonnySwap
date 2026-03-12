import { parseUnits } from 'viem';
import {
    AddLiquidityContainer,
    AddLiquidityButton,
    NoLiquidityMessage,
    LPTokenBalance,
    ErrorMessage,
    ExchangeRate,
} from '../../styles/AddLiquidityStyles';
import { executeContractWrite, getFeeData } from '../../lib/viemHelpers';
import { useAlerts } from '../../components/common/AlertProvider';
import { buildExplorerTxUrl } from '../../lib/explorer';

const AddLiquidityTokens = ({
    amountA,
    amountB,
    tokenA,
    tokenB,
    publicClient,
    walletClient,
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
    error
}) => {
    const { pushAlert } = useAlerts();
    const getDisplaySymbol = (tokenKey) => tokens[tokenKey]?.symbol || tokenKey;

    const handleApprove = async (tokenSymbol, amount) => {
        try {
            if (!walletClient || !publicClient || !account) {
                pushAlert({
                    variant: 'error',
                    message: 'Please connect your wallet to approve tokens.',
                });
                return;
            }
            const tokenAddress = getTokenAddress(tokenSymbol);
            if (!tokenAddress) throw new Error(`Token address for ${tokenSymbol} not found`);
    
            const decimals = getTokenDecimals(tokenSymbol);
            const amountParsed = parseUnits(amount.toString(), decimals);        
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

    const hasValidPair = tokenA && tokenB && tokenA !== 'default' && tokenB !== 'default';
    const exchangeRateDisplay =
        hasValidPair && typeof exchangeRate === 'number' && Number.isFinite(exchangeRate)
            ? parseFloat(exchangeRate).toFixed(6)
            : null;

    const handleAddLiquidity = async () => {
        try {
            if (!walletClient || !publicClient || !account) {
                pushAlert({
                    variant: 'error',
                    message: 'Please connect your wallet to add liquidity.',
                });
                return;
            }
            const tokenAddressA = getTokenAddress(tokenA);
            const tokenAddressB = getTokenAddress(tokenB);
            if (!tokenAddressA || !tokenAddressB) {
                pushAlert({
                    variant: 'error',
                    message: 'Invalid token addresses.',
                });
                return;
            }
            const decimalsA = getTokenDecimals(tokenA);
            const decimalsB = getTokenDecimals(tokenB);
            const amountADesired = parseUnits(amountA.toString(), decimalsA);
            const amountBDesired = parseUnits(amountB.toString(), decimalsB);
            const amountAMin = parseUnits((Number(amountA) * 0.95).toString(), decimalsA);
            const amountBMin = parseUnits((Number(amountB) * 0.95).toString(), decimalsB);
            const feeData = await getFeeData(publicClient);

            console.log(`Adding liquidity: ${amountADesired} of ${tokenA}, ${amountBDesired} of ${tokenB}`);
            const receipt = await executeContractWrite({
                publicClient,
                walletClient,
                account,
                address: routerAddress,
                abi: UniswapV2Router02ABI,
                functionName: 'addLiquidity',
                args: [
                    tokenAddressA,
                    tokenAddressB,
                    amountADesired,
                    amountBDesired,
                    amountAMin,
                    amountBMin,
                    account,
                    BigInt(Math.floor(Date.now() / 1000) + 60 * 10),
                ],
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
                <AddLiquidityButton
                    onClick={handleAddLiquidity}
                    disabled={!!error || !tokenA || !tokenB || !amountA || !amountB || !walletClient}
                >
                Add Liquidity
            </AddLiquidityButton>
        );
    };

    return (
        <AddLiquidityContainer>
            {hasValidPair && (
                <LPTokenBalance>
                    LP Token Balance: <strong>{lpBalance}</strong>
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

export default AddLiquidityTokens;
