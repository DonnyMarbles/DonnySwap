// CustomConnectButton.jsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useContext } from 'react';
import { Web3Context } from '../contexts/Web3Context';

const CustomConnectButton = () => {
  const { krestBalance } = useContext(Web3Context);

  // Function to format the balance to 8 decimal places
  const formatBalance = (balance) => {
    if (!balance) return '';
    return parseFloat(balance).toFixed(8);
  };

  return (
    <div>
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
          const connected = mounted && account && chain;

          return (
            <div
              {...(!mounted && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button onClick={openConnectModal} type="button">
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button onClick={openChainModal} type="button">
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={openAccountModal}
                      type="button"
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      {account.displayName}
                      {krestBalance ? ` (${formatBalance(krestBalance)} KREST)` : ''}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
};

export default CustomConnectButton;
