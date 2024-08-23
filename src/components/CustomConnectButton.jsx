// src/components/CustomConnectButton.jsx

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const CustomConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
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
            {connected ? (
              <button onClick={chain.id !== 2241 ? openChainModal : openAccountModal} type="button">
                {chain.id !== 2241
                  ? 'Wrong network'
                  : `Connected: ${account.displayName} | ${parseFloat(account.balanceFormatted).toFixed(6)} KREST`}
              </button>
            ) : (
              <button onClick={openConnectModal} type="button">
                Connect Wallet
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default CustomConnectButton;
