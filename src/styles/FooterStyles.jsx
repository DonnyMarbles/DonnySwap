import styled from 'styled-components';

export const FooterContainer = styled.footer`
  box-shadow: 0 4px 8px #000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background-color: #fcc375;
  width: 100%;
  border-radius: 10px;
  margin-top: 20px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const StyledConnectionStatus = styled.span`
  margin-right: 10px;
  
  &.connected {
    color: green;
  }
  
  &.not-connected {
    color: red;
  }
`;

const ConnectionStatus = ({ isConnected }) => {
  const className = isConnected ? 'connected' : 'not-connected';

  return (
    <StyledConnectionStatus className={className}>
      {isConnected ? 'Connected' : 'Not Connected'}
    </StyledConnectionStatus>
  );
};

export default ConnectionStatus;

export const LogoContainer = styled.div`
  display: flex;
  align-items: center;
`;

export const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  color: #000000;
  gap: 6px;
  img {
    margin-left: 5px;
  }
`;

export const BlockNumber = styled.div`
  font-size: 14px;
  color: #000000;
  font-weight: bold;
`;

