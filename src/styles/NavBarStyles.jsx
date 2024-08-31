import styled from 'styled-components';

export const NavBarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #dbaa65;
  width: 100%;
  box-shadow: 0 4px 8px #000;
  border-radius: 10px;
`;

export const NavLinks = styled.div`
  display: flex;
  gap: 20px;

  a {
    color: #000000;
    text-decoration: none;
    font-weight: bold;

    &:hover {
      color: #0056b3;
    }
  }
`;

export const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
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
