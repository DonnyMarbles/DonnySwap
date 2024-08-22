import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useContext, useEffect } from 'react';
import { Web3Context } from '../contexts/Web3Context';

const CustomConnectButton = () => {
  const { account: contextAccount, setAccount, krestBalance } = useContext(Web3Context);

  return (
    <div>
      <ConnectButton.Custom>
        {({
          account, // This is where the account is coming from
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const connected = mounted && account && chain;

          // Synchronize account from RainbowKit with Web3Context
          useEffect(() => {
            if (account && contextAccount !== account.address) {
              setAccount(account.address); // Update context account with the wallet address
            }
          }, [account, contextAccount, setAccount]);

          // Function to format the balance to 8 decimal places
          const formatBalance = (balance) => {
            if (!balance) return '';
            return parseFloat(balance).toFixed(8);
          };

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
