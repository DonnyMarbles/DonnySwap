import React, { useEffect, useState, useContext } from 'react';
import { useProvider, useAccount, useNetwork } from 'wagmi';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import { ethers } from 'ethers';
import WKRESTLogo from '../assets/WKREST_logo.png';
import fetchKRESTPrice from '../fetchKRESTPrice';

const Footer = () => {
  const provider = useProvider();
  const { address: account, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { tokens } = useContext(TokenContext); // Correctly use useContext to consume the TokenContext
  const { ERC20ABI } = useContext(ABIContext); // Correctly use useContext to consume the ABIContext
  const [blockNumber, setBlockNumber] = useState(0);
  const [krestPrice, setKrestPrice] = useState('0.0');

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
          element.innerText = ` ${balance}`;
        }
      }
      const krstBalanceElement = document.getElementById('balance-KRST');
      if (krstBalanceElement) {
        const balance = await getTokenBalance('KRST');
        krstBalanceElement.innerText = ` ${balance}`;
      }
    };

    const updatePrice = async () => {
      const price = await fetchKRESTPrice();
      if (price) {
        setKrestPrice(price.toFixed(6));  // Format price to six decimal places
      } else {
        setKrestPrice('N/A');  // Handle case when price is not available
      }
    };

    updatePrice();
    updateBalances();
  }, [blockNumber, account, provider, tokens]);

  return (
    <footer style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fcc375', color: '#000000' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ marginRight: '10px' }}>
          {isConnected ? (
            <span style={{ color: 'green' }}>Connected</span>
          ) : (
            <span style={{ color: 'red' }}>Not Connected</span>
          )}
        </div>
        <img src={WKRESTLogo} alt="WKREST Logo" width="20" />
      </div>
      <div>1 <img src={WKRESTLogo} alt="WKREST Logo" width="15" /> KREST : ${krestPrice} USD</div> {/* Display the KREST price */}
      <div>Block: {blockNumber}</div>
    </footer>
  );
};

export default Footer;
