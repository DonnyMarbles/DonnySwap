import React from 'react';
import tokenList from './tokenList.json';

const TokenSymbol = ({ tokenAddress }) => {
    const token = tokenList[tokenAddress.toLowerCase()] || { symbol: "Unknown Token", logo: "" };
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={token.logo} alt={token.symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
            <span>{token.symbol}</span>
        </div>
    );
};

export default TokenSymbol;
