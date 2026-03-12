import styled from 'styled-components';

export const RemoveLiquidityContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 20px;
  padding: 18px;
  background: #fcc375;
  border-radius: 10px;
  width: 100%;
  max-width: 400px;
  color: #000000;
  gap: 10px;
`;

export const RemoveLiquidityInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 6px 0;
  width: 100%;
  gap: 6px;

  select,
  input {
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #000;
    background: #dbaa65;
    color: #000;
  }
`;

export const RemoveLiquidityButton = styled.button`
  padding: 10px 20px;
  margin-top: 8px;
  border: none;
  border-radius: 5px;
  background: #dbaa65;
  color: #000;
  cursor: pointer;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
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

export const ExchangeRate = styled.div`
  margin-top: 12px;
  font-size: 0.9em;
  color: #000;
  text-align: center;
  width: 100%;
`;