import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import web3 from './web3'; // Make sure this import is correct
import DonnySwapAMM from './DonnySwapAMM';

const App = () => {
    const [account, setAccount] = useState('');
    const [walletAddress, setWalletAddress] = useState(''); // Add this state variable

    const connectWallet = async () => {
        try {
            const accounts = await web3.eth.requestAccounts();
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                setAccount(accounts[0]);
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
        }
    };

    const disconnectWallet = () => {
        setWalletAddress('');
        setAccount('');
    };

    const handleConnectWallet = async () => {
        await connectWallet();
    };

    return (
        <AppContainer>
            <Header>
                <Title>👑 DonnySwap</Title>
                <ConnectButton onClick={walletAddress ? disconnectWallet : handleConnectWallet}>
                    {walletAddress ? (
                        <>
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            <DisconnectOption onClick={disconnectWallet}>Disconnect</DisconnectOption>
                        </>
                    ) : (
                        'Connect Wallet'
                    )}
                </ConnectButton>
            </Header>
            <DonnySwapAMM />
        </AppContainer>
    );
};

const AppContainer = styled.div`
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
`;

const Header = styled.header`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
`;

const Title = styled.h1`
    font-size: 24px;
    color: #9b59b6;
`;

const ConnectButton = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: #9b59b6;
    color: white;
    font-size: 16px;
    cursor: pointer;
    &:hover {
        background-color: #7d3c98;
    }
`;

const DisconnectOption = styled.span`
    color: #7d3c98;
    cursor: pointer;
    margin-left: 10px;
    &:hover {
        text-decoration: underline;
    }
`;

export default App;
