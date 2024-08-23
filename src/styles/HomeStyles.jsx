import styled from 'styled-components';

export const HomeContainer = styled.div`
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

export const HomeFeaturesContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 10px 0;
  width: 100%;

  select, input {
    padding: 10px;
    margin: 5px 0;
    border-radius: 5px;
    border: 1px solid #ccc;
    background: #2c2c2c;
    color: #fff;
  }
`;

export const AddLiquidityButton = styled.button`
  padding: 10px 20px;
  margin-top: 10px;
  border: none;
  border-radius: 5px;
  background: #007bff;
  color: #fff;
  cursor: pointer;

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
  color: #ccc;
`;

export const ExchangeRate = styled.div`
  margin-top: 10px;
  font-size: 0.9em;
  color: #ccc;
`;

export const NoLiquidityMessage = styled.div`
  margin-top: 10px;
  color: #ff4d4d;
  font-size: 0.9em;
`;

export const ErrorMessage = styled.div`
  margin-top: 10px;
  color: #ff4d4d;
  font-size: 0.9em;
`;
