import { useEffect } from 'react';
import { parseEther } from 'viem';
import { SwapButton } from '../../styles/SwapStyles';
import { useTokens } from '../../contexts/TokenContext';
import { useWallet } from '../../contexts/WalletContext';
import { executeContractWrite } from '../../lib/viemHelpers';
import { useAlerts } from '../../components/common/AlertProvider';
import { buildExplorerTxUrl } from '../../lib/explorer';

const WrapUnwrap = ({ tokenA, tokenB, amountA, setAmountB, wrappedPEAQAddress, WrappedPEAQABI }) => {
  const { tokens } = useTokens();
  const { address: account, publicClient, walletClient } = useWallet();
  const { pushAlert } = useAlerts();

  useEffect(() => {
    setAmountB(amountA); // 1:1 ratio for wrapping/unwrapping
  }, [amountA, setAmountB]);

  const handleWrapUnwrap = async () => {
    try {
      if (!amountA || parseFloat(amountA) <= 0) {
        pushAlert({
          variant: 'error',
          message: 'Please enter a valid amount.',
        });
        return;
      }
      if (!walletClient || !publicClient || !account) {
        pushAlert({
          variant: 'error',
          message: 'Please connect your wallet to continue.',
        });
        return;
      }

      const amountInWei = parseEther(amountA.toString());
      const isDeposit = tokenA === 'PEAQ';

      const receipt = await executeContractWrite({
        publicClient,
        walletClient,
        account,
        address: wrappedPEAQAddress,
        abi: WrappedPEAQABI,
        functionName: isDeposit ? 'deposit' : 'withdraw',
        args: isDeposit ? [] : [amountInWei],
        value: isDeposit ? amountInWei : undefined,
      });

      pushAlert({
        variant: 'swap',
        message: `${getTokenSymbol(tokenA)} swapped to ${getTokenSymbol(tokenB)} successfully.`,
        link: buildExplorerTxUrl(receipt?.transactionHash),
        linkLabel: 'Swapped',
      });
    } catch (err) {
      console.error("Error wrapping/unwrapping tokens:", err);
      pushAlert({
        variant: 'error',
        message: err?.message || 'Error wrapping/unwrapping tokens.',
      });
    }
  };

  const getTokenSymbol = (address) => tokens[address]?.symbol || address;
  const getTokenLogo = (address) => tokens[address]?.logo || '';

  return (
    <>
      <SwapButton onClick={handleWrapUnwrap}>
        {tokenA === 'PEAQ' ? 'Wrap PEAQ' : 'Unwrap WPEAQ'}
      </SwapButton>
      <div>
        1 <img src={getTokenLogo(tokenA === 'PEAQ' ? 'PEAQ' : wrappedPEAQAddress)} alt="Token Logo" width="20" /> {getTokenSymbol(tokenA === 'PEAQ' ? 'PEAQ' : wrappedPEAQAddress)}
        = 1 <img src={getTokenLogo(tokenB === 'PEAQ' ? 'PEAQ' : wrappedPEAQAddress)} alt="Token Logo" width="20" /> {getTokenSymbol(tokenB === 'PEAQ' ? 'PEAQ' : wrappedPEAQAddress)}
      </div>
    </>
  );
};

export default WrapUnwrap;
