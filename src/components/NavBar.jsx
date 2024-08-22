import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { NavBarContainer, NavLinks, DropdownContainer, DropdownButton, DropdownContent } from '../styles/NavBarStyles';
import { Web3Context } from '../contexts/Web3Context';

const NavBar = () => {
  const { connectWallet, account, setAccount, setProvider, setSigner, provider } = useContext(Web3Context);
  const [dropdownVisible, setDropdownDisconnectVisible] = useState(false);
  const [dropdownVisibleLiquidity, setDropdownVisibleLiquidity] = useState(false);
  const [dropdownVisibleBalances, setDropdownVisibleBalances] = useState(false);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (provider && account) {
        try {
          const balance = await provider.getBalance(account);
          const formattedBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
          setBalance(formattedBalance);
        } catch (error) {
          console.error("Failed to fetch balance:", error);
        }
      }
    };

    fetchBalance();
  }, [provider, account]);

  const toggleDropdownLiquidity = () => {
    setDropdownVisibleLiquidity((prev) => !prev);
    setDropdownVisibleBalances(false); // Close other dropdown
  };

  const toggleDropdownBalances = () => {
    setDropdownVisibleBalances((prev) => !prev);
    setDropdownVisibleLiquidity(false); // Close other dropdown
  };

  const closeDropdowns = () => {
    setDropdownVisibleLiquidity(false);
    setDropdownVisibleBalances(false);
    setDropdownDisconnectVisible(false);
  };
  const toggleDisconnectDropdown = () => {
    setDropdownDisconnectVisible(!dropdownVisible);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setBalance(null); // Reset balance on disconnect
    closeDropdowns();
  };

  return (
    <NavBarContainer>
      <NavLinks>
        <Link to="/" onClick={closeDropdowns}>Home</Link>
        <Link to="/swap" onClick={closeDropdowns}>Swap</Link>
        <DropdownContainer>
          <DropdownButton onClick={toggleDropdownLiquidity}>
            Liquidity
          </DropdownButton>
          {dropdownVisibleLiquidity && (
            <DropdownContent>
              <Link to="/add-liquidity" onClick={closeDropdowns}>Add Liquidity</Link>
              <Link to="/remove-liquidity" onClick={closeDropdowns}>Remove Liquidity</Link>
            </DropdownContent>
          )}
        </DropdownContainer>
        <DropdownContainer>
          <DropdownButton onClick={toggleDropdownBalances}>
            Balances
          </DropdownButton>
          {dropdownVisibleBalances && (
            <DropdownContent>
              <Link to="/token-pairs" onClick={closeDropdowns}>LP Token Pairs</Link>
              <Link to="/token-balances" onClick={closeDropdowns}>Token Balances</Link>
            </DropdownContent>
          )}
        </DropdownContainer>
        <Link to="/address-converter" onClick={closeDropdowns}>Address Converter</Link>
      </NavLinks>
      
      <div style={{ position: 'relative' }}>
        <button onClick={account ? toggleDisconnectDropdown : connectWallet}>
          {account 
            ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)} | ${balance ? `${balance} KREST` : 'Fetching balance...'}` 
            : 'Connect Wallet'}
        </button>
        
        {dropdownVisible && account && (
          <div style={{ 
            position: 'absolute', 
            top: '100%', 
            right: 0, 
            backgroundColor: 'transparent', 
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
            zIndex: 1000 
          }}>
            <button 
              onClick={disconnectWallet} 
              style={{ padding: '8px 12px', width: '100%', textAlign: 'left' }}>
              Disconnect Wallet
            </button>
          </div>
        )}
      </div>
      
    </NavBarContainer>
  );
};

export default NavBar;
