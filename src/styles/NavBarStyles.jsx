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
