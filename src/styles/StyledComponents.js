// src/styles/StyledComponents.js
import styled, { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
    body {
        background-color: #121212;
        color: #ffffff;
        font-family: 'Arial', sans-serif;
    }
`;

export const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
`;

export const Title = styled.h1`
    font-size: 36px;
    color: #9b59b6;
    text-align: center;
    margin-bottom: 20px;
`;

export const ConnectButton = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: #9b59b6;
    color: white;
    font-size: 16px;
    cursor: pointer;
    &:hover {
        background-color: #8e44ad;
    }
`;

export const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;
    border: 1px solid #333;
    border-radius: 10px;
    max-width: 500px;
    margin: 20px auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    background-color: #1a1a1a;
`;

export const ButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
`;

export const ToggleButton = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: ${props => (props.active ? '#9b59b6' : '#555')};
    color: white;
    font-size: 16px;
    cursor: pointer;
    margin: 0 5px;
    &:hover {
        background-color: #8e44ad;
    }
`;

export const SectionTitle = styled.h2`
    font-size: 20px;
    margin-bottom: 10px;
    text-align: center;
    color: #9b59b6;
`;

export const SelectContainer = styled.div`
    display: flex;
    flex-direction: column;
`;

export const Select = styled.select`
    padding: 10px;
    border: 1px solid #555;
    border-radius: 5px;
    font-size: 16px;
    background-color: #333;
    color: white;
`;

export const TokenOption = styled.div`
    display: flex;
    align-items: center;
`;

export const BalanceContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 5px;
`;

export const Balance = styled.div`
    font-size: 16px;
    color: #ccc;
`;

export const Input = styled.input`
    padding: 10px;
    border: 1px solid #555;
    border-radius: 5px;
    font-size: 16px;
    background-color: #333;
    color: white;
`;

export const Button = styled.button`
    padding: 10px;
    border: none;
    border-radius: 5px;
    background-color: #9b59b6;
    color: white;
    font-size: 16px;
    cursor: pointer;
    &:hover {
        background-color: #8e44ad;
    }
`;

export const SwapSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const SwapInput = styled.input`
    padding: 10px;
    border: 1px solid #555;
    border-radius: 5px;
    font-size: 16px;
    background-color: #333;
    color: white;
    flex: 1;
`;

export const UsdValue = styled.div`
    font-size: 12px;
    color: #999;
    margin-top: -10px;
    margin-bottom: 10px;
`;

export const Label = styled.label`
    font-size: 14px;
    color: #ccc;
    margin-bottom: 5px;
`;

export const SlippageContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const SlippageInput = styled.input`
    padding: 10px;
    border: 1px solid #555;
    border-radius: 5px;
    font-size: 16px;
    background-color: #333;
    color: white;
    flex: 1;
`;

export const ExchangeRateContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

export const ExchangeRate = styled.div`
    font-size: 16px;
    color: #ccc;
`;

export const ExchangeRateInfo = styled.div`
    font-size: 14px;
    color: #ccc;
    margin-top: 10px;
    text-align: center;
`;

export const ExchangeRateToken = styled.img`
    width: 20px;
    height: 20px;
    vertical-align: middle;
    margin-right: 5px;
`;

export const SwapButton = styled.button`
    padding: 5px 10px;
    border: none;
    border-radius: 5px;
    background-color: #9b59b6;
    color: white;
    font-size: 14px;
    cursor: pointer;
    &:hover {
        background-color: #8e44ad;
    }
`;

export const RefreshButton = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: #9b59b6;
    color: white;
    font-size: 16px;
    cursor: pointer;
    margin-left: 10px;
    &:hover {
        background-color: #7d3c98;
    }
`;

export const LPTokenBalance = styled.div`
    text-align: center;
    margin-top: 10px;
    font-size: 16px;
    color: #fff;
`;

export const Separator = styled.div`
    height: 1px;
    background-color: #555;
    margin: 20px 0;
`;

export const HeaderContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 10px 0;
`;
