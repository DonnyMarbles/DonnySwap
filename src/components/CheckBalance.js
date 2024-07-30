// src/components/CheckBalance.js
import React, { useState } from 'react';
import { FormContainer, Input, Button, Balance } from '../styles/StyledComponents';
import TokenSymbol from './TokenSymbol';

const CheckBalance = ({ web3, ERC20ABI }) => {
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

export default CheckBalance;
