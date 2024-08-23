// src/components/NavBar.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBarContainer, NavLinks, DropdownContainer, DropdownButton, DropdownContent } from '../styles/NavBarStyles';
import CustomConnectButton from './CustomConnectButton';

const NavBar = () => {
  const [dropdownVisibleLiquidity, setDropdownVisibleLiquidity] = useState(false);
  const [dropdownVisibleBalances, setDropdownVisibleBalances] = useState(false);

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
        <CustomConnectButton />
      </div>
    </NavBarContainer>
  );
};

export default NavBar;
