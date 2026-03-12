import { useMemo } from 'react';
import { useWallet, PEAQ_CHAIN } from '../../contexts/WalletContext';

const CustomConnectButton = () => {
  const { address, isConnected, isConnecting, connect, disconnect, chainId } = useWallet();

  const shortenedAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const handleClick = async () => {
    if (isConnected) {
      disconnect();
      return;
    }
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet', error);
    }
  };

  const wrongNetwork = isConnected && chainId !== PEAQ_CHAIN.id;
  const label = (() => {
    if (isConnecting) return 'Connecting...';
    if (!isConnected) return 'Connect Wallet';
    if (wrongNetwork) return 'Wrong Network';
    return `Connected: ${shortenedAddress}`;
  })();

  return (
    <button onClick={handleClick} type="button" disabled={isConnecting}>
      {label}
    </button>
  );
};

export default CustomConnectButton;
