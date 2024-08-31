import styled from 'styled-components';

export const AddLiquidityContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 20px;
  padding: 20px;
  background: #fcc375;
  border-radius: 10px;
  width: 100%;
  max-width: 400px;
`;

export const AddLiquidityInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 10px 0;
  width: 100%;

  select, input {
    padding: 10px;
    margin: 5px 0;
    border-radius: 5px;
    border: 1px solid #000;
    background: #dbaa65;
    color: #000000;
  }
`;

export const AddLiquidityButton = styled.button`
  padding: 10px 20px;
  margin-top: 10px;
  border: none;
  border-radius: 5px;
  background: #dbaa65;
  color: #000;
  cursor: pointer;
  border: 1px solid #000;
  &:hover {
    background: #0056b3;
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

export const LPTokenBalance = styled.div`
  margin-top: 15px;
  font-size: 0.9em;
  color: #000;
`;

export const ExchangeRate = styled.div`
  margin-top: 10px;
  font-size: 0.9em;
  color: #000;
`;

export const NoLiquidityMessage = styled.div`
  margin-top: 10px;
  color: #000;
  font-size: 0.9em;
`;

export const ErrorMessage = styled.div`
  margin-top: 10px;
  color: #000;
  font-size: 0.9em;
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