import styled from 'styled-components';

export const FooterContainer = styled.footer`
  box-shadow: 0 4px 8px #000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #fcc375;
  width: 102%;
  border-radius: 10px;
  margin-top: 20px;
`;

export const ConnectionStatus = styled.span`
  margin-right: 10px;
  color: ${(props) => (props.isConnected ? 'green' : 'red')};
`;

export const LogoContainer = styled.div`
  display: flex;
  align-items: center;
`;

export const PriceContainer = styled.div`
  display: flex;
  align-items: center;

  img {
    margin-left: 5px;
  }
`;

export const BlockNumber = styled.div`
  font-size: 14px;
  font-weight: bold;
`;

