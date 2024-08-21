import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBarContainer, NavLinks, DropdownContainer, DropdownButton, DropdownContent } from '../styles/NavBarStyles';
import CustomConnectButton from './CustomConnectButton';

const NavBar = () => {
  const [dropdownVisibleLiquidity, setDropdownVisibleLiquidity] = useState(false);
  const [dropdownVisibleBalances, setDropdownVisibleBalances] = useState(false);

  const toggleDropdownLiquidity = () => {
    setDropdownVisibleLiquidity(!dropdownVisibleLiquidity);
  };
  const toggleDropdownBalances = () => {
    setDropdownVisibleBalances(!dropdownVisibleBalances);
  };
  const closeDropdownLiquidity = () => {
    setDropdownVisibleLiquidity(false);
  };
  const closeDropdownBalances = () => {
    setDropdownVisibleBalances(false);
  };

  return (
    <NavBarContainer>
      <NavLinks>
        <Link to="/">Home</Link>
        <Link to="/swap">Swap</Link>
        <DropdownContainer>
          <DropdownButton onClick={toggleDropdownLiquidity}>
            Liquidity
          </DropdownButton>
          {dropdownVisibleLiquidity && (
            <DropdownContent>
              <Link to="/add-liquidity" onClick={closeDropdownLiquidity}>Add Liquidity</Link>
              <Link to="/remove-liquidity" onClick={closeDropdownLiquidity}>Remove Liquidity</Link>
            </DropdownContent>
          )}
        </DropdownContainer>
        <DropdownContainer>
          <DropdownButton onClick={toggleDropdownBalances}>
            Balances
          </DropdownButton>
          {dropdownVisibleBalances && (
            <DropdownContent>
              <Link to="/token-pairs" onClick={closeDropdownBalances}>LP Token Pairs</Link>
              <Link to="/token-balances" onClick={closeDropdownBalances}>Token Balances</Link>
            </DropdownContent>
          )}
        </DropdownContainer>
        <Link to="/address-converter">Address Converter</Link>
      </NavLinks>
      <CustomConnectButton />
    </NavBarContainer>
  );
};

export default NavBar;
