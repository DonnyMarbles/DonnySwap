import styled from 'styled-components';

export const SwapContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fcc375;
  margin: clamp(1rem, 3vw, 1.5rem) auto;
  box-shadow: 0 4px 8px #000;
  padding: clamp(1rem, 3vw, 1.75rem);
  border-radius: 12px;
  width: min(100%, 420px);
  color: #000000;

  @media (max-width: 600px) {
    width: 100%;
    align-self: stretch;
  }
`;

export const SwapInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 10px 0;
  width: 100%;
  gap: 8px;

  select, input {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #000000;
    background: #dbaa65;
    color: #000000;
    width: 100%;
  }
`;

export const SwapButton = styled.button`
  padding: 12px 20px;
  margin-top: 10px;
  border: none;
  border-radius: 6px;
  background: #dbaa65;
  color: #000000;
  cursor: pointer;
  border: 1px solid #000;
  &:hover {
    background: #0056b3;
    color: #fff;
  }
`;

export const TokenInfo = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
  font-size: 0.9em;

  img {
    margin-right: 5px;
  }
`;

export const ExchangeRate = styled.div`
  margin-top: 15px;
  font-size: 1.0em;
  color: #000000;
  display: flex;
  align-items: center;

  img {
    margin: 0 5px;
  }
`;

export const NoLiquidityMessage = styled.div`
  margin-top: 10px;
  color: #000000;
  font-size: 0.9em;
`;

export const SlippageInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 10px 0;
  width: 100%;
  gap: 6px;

  label {
    color: #000000;
  }

  input {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #000000;
    background: #dbaa65;
    color: #000000;
    width: 100%;
  }
`;

export const LoadingSpinner = styled.div`
  margin: 50px auto;
  text-align: center;
  img {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: block;
    margin: 0 auto;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  p {
    margin-top: 10px;
    font-size: 1.2rem;
    color: #333;
    font-weight: bold;
  }
`;

export const GreyedOutUSD = styled.span`
  color: grey;
  font-size: 0.8em;
  display: flex;
`;