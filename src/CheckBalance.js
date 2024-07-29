import React, { useState } from 'react';
import styled from 'styled-components';
import web3 from './web3';
import ERC20ABI from './ERC20ABI.json'; // ABI for ERC20 tokens
import TokenSymbol from './TokenSymbol';

const CheckBalance = () => {
    const [tokenAddress, setTokenAddress] = useState('');
    const [balance, setBalance] = useState('');

    const handleCheckBalance = async () => {
        const accounts = await web3.eth.getAccounts();
        const tokenContract = new web3.eth.Contract(ERC20ABI, tokenAddress);
        const balance = await tokenContract.methods.balanceOf(accounts[0]).call();
        setBalance(web3.utils.fromWei(balance, 'ether'));
    };

    return (
        <FormContainer>
            <Input value={tokenAddress} onChange={e => setTokenAddress(e.target.value)} placeholder="Token Address" />
            <Button onClick={handleCheckBalance}>Check Balance</Button>
            {balance && (
                <Balance>
                    Balance: {balance} <TokenSymbol tokenAddress={tokenAddress} />
                </Balance>
            )}
        </FormContainer>
    );
};

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
    max-width: 400px;
    margin: 20px auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 16px;
`;

const Button = styled.button`
    padding: 10px;
    border: none;
    border-radius: 3px;
    background-color: #007bff;
    color: white;
    font-size: 16px;
    cursor: pointer;
    &:hover {
        background-color: #0056b3;
    }
`;

const Balance = styled.div`
    font-size: 18px;
    margin-top: 10px;
`;

export default CheckBalance;
