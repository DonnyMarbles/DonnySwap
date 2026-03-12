import styled, { css } from 'styled-components';

export const NavBarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #dbaa65;
  width: 100%;
  box-shadow: 0 4px 8px #000;
  border-radius: 10px;
  position: relative;
  gap: 16px;

  @media (max-width: 960px) {
    flex-wrap: wrap;
    padding: 12px 16px;
  }
`;

export const NavLinks = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;

  a {
    color: #000000;
    text-decoration: none;
    font-weight: bold;

    &:hover {
      color: #0056b3;
    }
  }

  @media (max-width: 960px) {
    &:not([data-variant='drawer']) {
      display: none;
    }
  }

  &[data-variant='drawer'] {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    gap: 8px;

    a {
      width: 100%;
      padding: 10px 0;
    }
  }
`;

export const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;

  &[data-variant='drawer'] {
    width: 100%;
  }
`;

export const DropdownButton = styled.button`
  background: transparent;
  color: #000000;
  padding: 0px 2px 2px;  /* Adjusted padding for better alignment */
  border: none;
  cursor: pointer;
  font-weight: bold;
  line-height: 1;  /* Ensures vertical alignment with the links */

  &:hover {
    color: #0056b3;
  }

  ${props => props.$variant === 'drawer' && css`
    width: 100%;
    text-align: left;
    padding: 10px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  `}
`;


export const DropdownContent = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  background-color: #dbaa65;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 1;
  border: 1px solid #fcc375;

  a {
    color: #000000;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
    font-weight: bold;

    &:hover {
      background-color: #fcc375;
      color: #0056b3;
    }
  }

  ${props => props.$variant === 'drawer' && css`
    position: static;
    min-width: 100%;
    border: none;
    box-shadow: none;
    background-color: transparent;
    padding-left: 16px;

    a {
      background: transparent;
      padding: 8px 0;
    }
  `}
`;

export const ConnectButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background: #dbaa65;
  color: #000000;
  cursor: pointer;

  &:hover {
    background: #0056b3;
  }
`;

export const ConnectWrapper = styled.div`
  position: relative;

  @media (max-width: 960px) {
    margin-left: auto;
  }
`;

export const MenuButton = styled.button`
  display: none;
  background: transparent;
  border: 1px solid #000;
  border-radius: 6px;
  color: #000;
  padding: 8px 12px;
  font-weight: bold;

  @media (max-width: 960px) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
`;

export const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: ${props => (props.$isOpen ? 1 : 0)};
  pointer-events: ${props => (props.$isOpen ? 'auto' : 'none')};
  transition: opacity 0.2s ease;
  z-index: 90;
`;

export const DrawerPanel = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 80vw);
  background: #fcd89b;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.35);
  transform: translateX(${props => (props.$isOpen ? '0' : '100%')});
  transition: transform 0.25s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
`;

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0;
    font-size: 1rem;
    color: #000;
  }
`;

export const DrawerContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .drawer-connect {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);

    button {
      width: 100%;
    }
  }
`;
