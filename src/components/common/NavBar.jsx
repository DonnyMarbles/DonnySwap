// src/components/NavBar.jsx

import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  NavBarContainer,
  NavLinks,
  DropdownContainer,
  DropdownButton,
  DropdownContent,
  ConnectWrapper,
  MenuButton,
  DrawerOverlay,
  DrawerPanel,
  DrawerHeader,
  DrawerContent,
  ExternalNavLink,
} from '../../styles/NavBarStyles';
import CustomConnectButton from './CustomConnectButton';

const NavBar = () => {
  const [dropdownVisibleLiquidity, setDropdownVisibleLiquidity] = useState(false);
  const [dropdownVisibleBalances, setDropdownVisibleBalances] = useState(false);
  const [dropdownVisibleNFTs, setDropdownVisibleNFTs] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  const toggleDropdownLiquidity = () => {
    setDropdownVisibleLiquidity((prev) => !prev);
    setDropdownVisibleBalances(false); // Close other dropdowns
    setDropdownVisibleNFTs(false);
  };

  const toggleDropdownBalances = () => {
    setDropdownVisibleBalances((prev) => !prev);
    setDropdownVisibleLiquidity(false); // Close other dropdowns
    setDropdownVisibleNFTs(false);
  };

  const toggleDropdownNFTs = () => {
    setDropdownVisibleNFTs((prev) => !prev);
    setDropdownVisibleLiquidity(false); // Close other dropdowns
    setDropdownVisibleBalances(false);
  };

  const closeDropdowns = () => {
    setDropdownVisibleLiquidity(false);
    setDropdownVisibleBalances(false);
    setDropdownVisibleNFTs(false);
  };

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleNavigate = () => {
    closeDropdowns();
    closeDrawer();
  };

  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  const renderNavLinks = (variant = 'desktop') => (
    <NavLinks data-variant={variant}>
      <Link to="/" onClick={handleNavigate}>Home</Link>
      <Link to="/swap" onClick={handleNavigate}>Swap</Link>
      <DropdownContainer data-variant={variant}>
        <DropdownButton
          onClick={toggleDropdownLiquidity}
          $variant={variant}
          aria-expanded={dropdownVisibleLiquidity}
        >
          Liquidity
        </DropdownButton>
        {dropdownVisibleLiquidity && (
          <DropdownContent $variant={variant}>
            <Link to="/add-liquidity" onClick={handleNavigate}>Add Liquidity</Link>
            <Link to="/remove-liquidity" onClick={handleNavigate}>Remove Liquidity</Link>
          </DropdownContent>
        )}
      </DropdownContainer>
      <DropdownContainer data-variant={variant}>
        <DropdownButton
          onClick={toggleDropdownBalances}
          $variant={variant}
          aria-expanded={dropdownVisibleBalances}
        >
          Balances
        </DropdownButton>
        {dropdownVisibleBalances && (
          <DropdownContent $variant={variant}>
            <Link to="/token-pairs" onClick={handleNavigate}>LP Token Pairs</Link>
            <Link to="/token-balances" onClick={handleNavigate}>Token Balances</Link>
          </DropdownContent>
        )}
      </DropdownContainer>
      <Link to="/address-converter" onClick={handleNavigate}>Address Converter</Link>
      <DropdownContainer data-variant={variant}>
        <DropdownButton
          onClick={toggleDropdownNFTs}
          $variant={variant}
          aria-expanded={dropdownVisibleNFTs}
        >
          DSFO NFTs
        </DropdownButton>
        {dropdownVisibleNFTs && (
          <DropdownContent $variant={variant}>
            <Link to="/mint-DSFO-NFTs" onClick={handleNavigate}>Mint DFSO NFTs</Link>
            <Link to="/fee-dashboard" onClick={handleNavigate}>DEX Fee Dashboard</Link>
          </DropdownContent>
        )}
      </DropdownContainer>
      <ExternalNavLink href="/docs/introduction" target="_blank" rel="noopener noreferrer" onClick={handleNavigate}>
        Docs
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M3.5 1H1.5C1.22386 1 1 1.22386 1 1.5V10.5C1 10.7761 1.22386 11 1.5 11H10.5C10.7761 11 11 10.7761 11 10.5V8.5M7 1H11V5M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ExternalNavLink>
    </NavLinks>
  );

  return (
    <NavBarContainer>
      <MenuButton
        type="button"
        onClick={toggleDrawer}
        aria-expanded={isDrawerOpen}
        aria-label="Toggle navigation menu"
      >
        Menu
      </MenuButton>
      {renderNavLinks()}
      <ConnectWrapper>
        <CustomConnectButton />
      </ConnectWrapper>

      <DrawerOverlay $isOpen={isDrawerOpen} onClick={closeDrawer} aria-hidden={!isDrawerOpen} />
      <DrawerPanel
        $isOpen={isDrawerOpen}
        aria-hidden={!isDrawerOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <DrawerHeader>
          <h3>Navigation</h3>
          <button type="button" onClick={closeDrawer}>
            Close
          </button>
        </DrawerHeader>
        <DrawerContent>
          {renderNavLinks('drawer')}
          <div className="drawer-connect">
            <CustomConnectButton />
          </div>
        </DrawerContent>
      </DrawerPanel>
    </NavBarContainer>
  );
};

export default NavBar;
