// NavBar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { NavBarContainer, NavLinks } from '../styles/NavBarStyles';
import CustomConnectButton from './CustomConnectButton';

const NavBar = () => {
  return (
    <NavBarContainer>
      <NavLinks>
        <Link to="/">Home</Link>
        <Link to="/swap">Swap</Link>
        <Link to="/add-liquidity">Add Liquidity</Link>
        <Link to="/remove-liquidity">Remove Liquidity</Link>
        <Link to="/address-converter">Address Converter</Link>
        <Link to="/token-pairs">LP Token Pairs</Link>
      </NavLinks>
      <CustomConnectButton />
    </NavBarContainer>
  );
};

export default NavBar;
