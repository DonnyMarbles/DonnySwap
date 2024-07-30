// src/components/RefreshBalances.js
import React from 'react';
import { RefreshButton } from '../styles/StyledComponents';

const RefreshBalances = ({ web3, ERC20ABI, tokenA, tokenB, setBalanceA, setBalanceB }) => {
    const fetchBalances = async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];

            if (tokenA) {
                const tokenAContract = new web3.eth.Contract(ERC20ABI, tokenA);
                const tokenABalance = await tokenAContract.methods.balanceOf(account).call();
                setBalanceA(web3.utils.fromWei(tokenABalance, 'ether'));
            }

            if (tokenB) {
                const tokenBContract = new web3.eth.Contract(ERC20ABI, tokenB);
                const tokenBBalance = await tokenBContract.methods.balanceOf(account).call();
                setBalanceB(web3.utils.fromWei(tokenBBalance, 'ether'));
            }
        } catch (error) {
            console.error('Error fetching balances:', error);
        }
    };

    return (
        <RefreshButton onClick={fetchBalances}>
            Refresh Balances 🔄
        </RefreshButton>
    );
};

export default RefreshBalances;
