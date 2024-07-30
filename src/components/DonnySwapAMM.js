// src/components/DonnySwapAMM.js
import React, { useState } from 'react';
import { GlobalStyle, FormContainer, ButtonContainer, ToggleButton } from '../styles/StyledComponents';
import AddLiquidity from './AddLiquidity';
import SwapTokens from './SwapTokens';
import CheckBalance from './CheckBalance';
import RefreshBalances from './RefreshBalances';

const DonnySwapAMM = ({ web3, UniswapV2Router02ABI, ERC20ABI, tokenList }) => {
    const [view, setView] = useState('addLiquidity');
    const [balanceA, setBalanceA] = useState('');
    const [balanceB, setBalanceB] = useState('');
    const [tokenA, setTokenA] = useState('');
    const [tokenB, setTokenB] = useState('');

    return (
        <div>
            <GlobalStyle />
            <FormContainer>
                <ButtonContainer>
                    <ToggleButton onClick={() => setView('addLiquidity')} active={view === 'addLiquidity'}>
                        Add Liquidity
                    </ToggleButton>
                    <ToggleButton onClick={() => setView('swapTokens')} active={view === 'swapTokens'}>
                        Swap Tokens
                    </ToggleButton>
                    <RefreshBalances
                        web3={web3}
                        ERC20ABI={ERC20ABI}
                        tokenA={tokenA}
                        tokenB={tokenB}
                        setBalanceA={setBalanceA}
                        setBalanceB={setBalanceB}
                    />
                </ButtonContainer>
                {view === 'addLiquidity' && (
                    <AddLiquidity
                        web3={web3}
                        UniswapV2Router02ABI={UniswapV2Router02ABI}
                        ERC20ABI={ERC20ABI}
                        balanceA={balanceA}
                        balanceB={balanceB}
                        setTokenA={setTokenA}
                        setTokenB={setTokenB}
                        tokenList={tokenList}
                    />
                )}
                {view === 'swapTokens' && (
                    <SwapTokens
                        web3={web3}
                        UniswapV2Router02ABI={UniswapV2Router02ABI}
                        ERC20ABI={ERC20ABI}
                        balanceA={balanceA}
                        balanceB={balanceB}
                        setTokenA={setTokenA}
                        setTokenB={setTokenB}
                        tokenList={tokenList}
                    />
                )}
                <CheckBalance web3={web3} ERC20ABI={ERC20ABI} />
            </FormContainer>
        </div>
    );
};

export default DonnySwapAMM;
