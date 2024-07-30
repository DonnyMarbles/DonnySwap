// src/App.js
import React, { useState } from 'react';
import DonnySwapAMM from './components/DonnySwapAMM';
import { GlobalStyle, AppContainer, Title, ConnectButton } from './styles/StyledComponents';

const App = ({ web3, UniswapV2Router02ABI, ERC20ABI, tokenList }) => {
    const [account, setAccount] = useState('');

    const handleConnectWallet = async () => {
        const accounts = await web3.eth.requestAccounts();
        if (accounts.length > 0) {
            setAccount(accounts[0]);
        }
    };

    return (
        <div>
            <GlobalStyle />
            <AppContainer>
                <Title>👑 DonnySwap</Title>
                <ConnectButton onClick={handleConnectWallet}>
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
                </ConnectButton>
            </AppContainer>
            <DonnySwapAMM
                web3={web3}
                UniswapV2Router02ABI={UniswapV2Router02ABI}
                ERC20ABI={ERC20ABI}
                tokenList={tokenList}
            />
        </div>
    );
};

export default App;
