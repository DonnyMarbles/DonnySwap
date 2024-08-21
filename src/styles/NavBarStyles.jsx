import styled from 'styled-components';

export const NavBarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #1e1e1e;
  width: 100%;
`;

export const NavLinks = styled.div`
  display: flex;
  gap: 20px;

  a {
    color: #007bff;
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
  background: #1e1e1e;
  color: #007bff;
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
  background-color: #1e1e1e;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 1;
  border: 1px solid #007bff;

  a {
    color: #007bff;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
    font-weight: bold;

    &:hover {
      background-color: #333;
      color: #0056b3;
    }
  }
`;

export const ConnectButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background: #007bff;
  color: #fff;
  cursor: pointer;

  &:hover {
    background: #0056b3;
  }
`;
