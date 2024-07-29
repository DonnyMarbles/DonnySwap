import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import web3 from './web3';
import UniswapV2Router02ABI from './UniswapV2Router02ABI.json';
import TokenSymbol from './TokenSymbol';
import tokenList from './tokenList.json';
import ERC20ABI from './ERC20ABI.json';

const routerAddress = '0x3ED5fCaB141cD5B5CF11395fAc6422F8D1A0356E';

const AddLiquidity = () => {
    const [tokenA, setTokenA] = useState('');
    const [tokenB, setTokenB] = useState('');
    const [amountADesired, setAmountADesired] = useState('');
    const [amountBDesired, setAmountBDesired] = useState('');
    const [exchangeRate, setExchangeRate] = useState(null);
    const [balanceA, setBalanceA] = useState('');
    const [balanceB, setBalanceB] = useState('');

    let routerContract;

    try {
        routerContract = new web3.eth.Contract(UniswapV2Router02ABI, routerAddress);
    } catch (error) {
        console.error('Failed to create contract instance:', error);
    }

    useEffect(() => {
        const fetchExchangeRate = async () => {
            if (tokenA && tokenB) {
                const amountsOut = await routerContract.methods.getAmountsOut(web3.utils.toWei('1', 'ether'), [tokenA, tokenB]).call();
                setExchangeRate(parseFloat(web3.utils.fromWei(amountsOut[1], 'ether')).toFixed(4));
            }
        };

        fetchExchangeRate();
    }, [tokenA, tokenB, routerContract.methods]);

    useEffect(() => {
        const fetchBalance = async (token, setBalance) => {
            if (token) {
                const accounts = await web3.eth.getAccounts();
                const tokenContract = new web3.eth.Contract(ERC20ABI, token);
                const balance = await tokenContract.methods.balanceOf(accounts[0]).call();
                setBalance(web3.utils.fromWei(balance, 'ether'));
            }
        };

        fetchBalance(tokenA, setBalanceA);
        fetchBalance(tokenB, setBalanceB);
    }, [tokenA, tokenB]);

    const handleAddLiquidity = async () => {
        const accounts = await web3.eth.getAccounts();
        await routerContract.methods.addLiquidity(
            tokenA,
            tokenB,
            web3.utils.toWei(amountADesired, 'ether'),
            web3.utils.toWei(amountBDesired, 'ether'),
            0,
            0,
            accounts[0],
            Math.floor(Date.now() / 1000) + 60 * 20
        ).send({ from: accounts[0] });
    };

    const handleSwapTokens = () => {
        const tempToken = tokenA;
        setTokenA(tokenB);
        setTokenB(tempToken);
    };

    return (
        <FormContainer>
            <SelectContainer>
                <Select value={tokenA} onChange={e => setTokenA(e.target.value)} placeholder="Select Token A">
                    <option value="">Select Token A</option>
                    {Object.keys(tokenList).map(address => (
                        <option key={address} value={address}>
                            <TokenOption>
                                <img src={tokenList[address].logo} alt={tokenList[address].symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                {tokenList[address].symbol}
                            </TokenOption>
                        </option>
                    ))}
                </Select>
                {balanceA && <Balance>Balance: {balanceA} <TokenSymbol tokenAddress={tokenA} /></Balance>}
            </SelectContainer>
            <SelectContainer>
                <Select value={tokenB} onChange={e => setTokenB(e.target.value)} placeholder="Select Token B">
                    <option value="">Select Token B</option>
                    {Object.keys(tokenList).filter(address => address !== tokenA).map(address => (
                        <option key={address} value={address}>
                            <TokenOption>
                                <img src={tokenList[address].logo} alt={tokenList[address].symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                {tokenList[address].symbol}
                            </TokenOption>
                        </option>
                    ))}
                </Select>
                {balanceB && <Balance>Balance: {balanceB} <TokenSymbol tokenAddress={tokenB} /></Balance>}
            </SelectContainer>
            {exchangeRate && (
                <ExchangeRateContainer>
                    <ExchangeRate>
                        1 <TokenSymbol tokenAddress={tokenA} /> = {exchangeRate} <TokenSymbol tokenAddress={tokenB} />
                    </ExchangeRate>
                    <SwapButton onClick={handleSwapTokens}>Swap</SwapButton>
                </ExchangeRateContainer>
            )}
            <Input value={amountADesired} onChange={e => setAmountADesired(e.target.value)} placeholder="Amount A Desired" />
            <Input value={amountBDesired} onChange={e => setAmountBDesired(e.target.value)} placeholder="Amount B Desired" />
            <Button onClick={handleAddLiquidity}>Add Liquidity</Button>
        </FormContainer>
    );
};

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 10px;
    max-width: 500px;
    margin: 20px auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    background-color: #fff;
`;

const SelectContainer = styled.div`
    display: flex;
    flex-direction: column;
`;

const Select = styled.select`
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 16px;
`;

const TokenOption = styled.div`
    display: flex;
    align-items: center;
`;

const Balance = styled.div`
    font-size: 16px;
    color: #555;
    margin-top: 5px;
`;

const Input = styled.input`
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 16px;
`;

const Button = styled.button`
    padding: 10px;
    border: none;
    border-radius: 5px;
    background-color: #007bff;
    color: white;
    font-size: 16px;
    cursor: pointer;
    &:hover {
        background-color: #0056b3;
    }
`;

const ExchangeRateContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const ExchangeRate = styled.div`
    font-size: 16px;
    color: #555;
`;

const SwapButton = styled.button`
    padding: 5px 10px;
    border: none;
    border-radius: 5px;
    background-color: #007bff;
    color: white;
    font-size: 14px;
    cursor: pointer;
    &:hover {
        background-color: #0056b3;
    }
`;

export default AddLiquidity;
