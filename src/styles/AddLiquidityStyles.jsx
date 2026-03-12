import styled from 'styled-components';

export const AddLiquidityContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: clamp(1rem, 3vw, 1.5rem) auto;
  padding: clamp(1rem, 3vw, 1.75rem);
  background: #fcc375;
  border-radius: 12px;
  width: min(100%, 440px);
  color: #000000;
  gap: 8px;

  h2 {
    margin: 0 0 8px;
  }
`;

export const AddLiquidityInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 6px 0;
  width: 100%;
  gap: 10px;

  select, input {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #000;
    background: #dbaa65;
    color: #000000;
    width: 100%;
  }
`;

export const AddLiquidityButton = styled.button`
  padding: 12px 20px;
  margin-top: 2px;
  border: none;
  border-radius: 6px;
  background: #dbaa65;
  color: #000;
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
  justify-content: flex-start;
  gap: 4px;
  margin-top: 4px;
  width: 100%;
  font-size: 0.9em;

  img {
    margin-right: 4px;
  }

  span {
    font-weight: 500;
  }
`;

export const LPTokenBalance = styled.div`
  margin: 10px 0;
  width: 100%;
  font-size: 0.95em;
  color: #000;
  display: flex;
  flex-direction: column;
  gap: 4px;

  a {
    color: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  a:hover {
    color: #0d47a1;
  }

  strong {
    font-weight: 700;
  }

  p {
    margin: 0;
    line-height: 1.3;
  }
`;

export const ExchangeRate = styled.div`
  margin-top: 12px;
  font-size: 0.9em;
  color: #000;
  text-align: center;
  width: 100%;
`;

export const NoLiquidityMessage = styled.div`
  margin-top: 12px;
  color: #000;
  font-size: 0.9em;
  text-align: center;
  width: 100%;
`;

export const ErrorMessage = styled.div`
  margin-top: 12px;
  color: #000;
  font-size: 0.9em;
  text-align: center;
  width: 100%;
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