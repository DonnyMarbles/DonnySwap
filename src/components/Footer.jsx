import React, { useEffect, useState, useContext } from 'react';
import { useProvider, useAccount, useNetwork } from 'wagmi';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import { KRESTPriceContext } from '../contexts/KRESTPriceContext';
import { ethers } from 'ethers';
import WKRESTLogo from '../assets/WKREST_logo.png';
import { FooterContainer, ConnectionStatus, LogoContainer, PriceContainer, BlockNumber } from '../styles/FooterStyles';

const Footer = () => {
  const provider = useProvider();
  const { address: account, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { tokens } = useContext(TokenContext);
  const { ERC20ABI } = useContext(ABIContext);
  const { krestPrice, loading, error } = useContext(KRESTPriceContext);
  const [blockNumber, setBlockNumber] = useState(0);

  function toFixedDown(value, decimals) {
    return (Math.floor(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
  }
  useEffect(() => {
    if (provider) {
      const updateBlockNumber = async () => {
        const blockNumber = await provider.getBlockNumber();
        setBlockNumber(blockNumber);
      };

      const interval = setInterval(updateBlockNumber, 1000);
      return () => clearInterval(interval);
    }
  }, [provider]);

  const getTokenBalance = async (tokenAddress) => {
    if (provider && account) {
      if (tokenAddress === 'KRST') {
        const balance = await provider.getBalance(account);
        return ethers.utils.formatUnits(balance, 18);
      } else {
        const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
        const balance = await contract.balanceOf(account);
        return ethers.utils.formatUnits(balance, 18);
      }
    }
    return '0.0';
  };

  useEffect(() => {
    const updateBalances = async () => {
      const tokenAddresses = Object.keys(tokens);
      for (const address of tokenAddresses) {
        const element = document.getElementById(`balance-${address}`);
        if (element) {
          const balance = await getTokenBalance(address);
          element.innerText = ` ${toFixedDown(parseFloat(balance), 8)}`;
        }
      }
      const krstBalanceElement = document.getElementById('balance-KRST');
      if (krstBalanceElement) {
        const balance = await getTokenBalance('KRST');
        krstBalanceElement.innerText = ` ${toFixedDown(parseFloat(balance), 8)}`;
      }
    };

    updateBalances();
  }, [blockNumber, account, provider, tokens]);

  return (
    <FooterContainer>
      <LogoContainer>
        <ConnectionStatus isConnected={isConnected}>
          {isConnected ? 'Connected' : 'Not Connected'}
        </ConnectionStatus>
        <img src={WKRESTLogo} alt="WKREST Logo" width="20" />
      </LogoContainer>
      <PriceContainer>
        1 <img src={WKRESTLogo} alt="WKREST Logo" width="15" /> KREST : ${loading ? 'Loading...' : error ? 'N/A' : krestPrice.toFixed(6)} USD
      </PriceContainer>
      <BlockNumber>Block: {blockNumber}</BlockNumber>
    </FooterContainer>
  );
};

export default Footer;
