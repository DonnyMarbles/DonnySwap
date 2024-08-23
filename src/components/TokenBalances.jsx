import React, { useState, useEffect, useContext } from 'react';
import { useAccount, useProvider, useNetwork } from 'wagmi';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import { ethers } from 'ethers';
import { TableContainer, StyledTable, LogoCell, PercentageCell } from '../styles/TokenBalancesStyles';
import { ApiPromise, WsProvider } from '@polkadot/api';

const TokenBalances = () => {
    const { address } = useAccount();
    const provider = useProvider();
    const { chain } = useNetwork();
    const { tokens } = useContext(TokenContext);
    const { ERC20ABI, UniswapV2PairABI, UniswapV2FactoryABI } = useContext(ABIContext);
    const [blockNumber, setBlockNumber] = useState(0);
    const [tokenData, setTokenData] = useState([]);

    useEffect(() => {
        if (provider) {
            const updateBlockNumber = async () => {
                const blockNumber = await provider.getBlockNumber();
                setBlockNumber(blockNumber);
            };

            const interval = setInterval(updateBlockNumber, 5000);
            return () => clearInterval(interval);
        }
    }, [provider]);

    useEffect(() => {
        if (provider && address && chain?.id === 2241) { // Ensure only runs on KREST network
            console.log('tokens object:', tokens);
            fetchTokenData();
        }
    }, [provider, address, blockNumber, chain]);

    const fetchKRESTCirculatingSupply = async () => {
        let wsProvider;
        try {
            wsProvider = new WsProvider('wss://krest.betterfuturelabs.xyz');
            const api = await ApiPromise.create({ provider: wsProvider });

            const circulatingSupply = await api.query.balances.totalIssuance();
            console.log(`Circulating Supply of KREST: ${circulatingSupply.toString()}`);

            return ethers.BigNumber.from(circulatingSupply.toString());
        } catch (error) {
            console.error('Error fetching KREST circulating supply:', error);
            return ethers.BigNumber.from('0');
        } finally {
            if (wsProvider) {
                await wsProvider.disconnect();
            }
        }
    };

    const fetchTokenData = async () => {
        const data = [];
        const nullAddress = '0x0000000000000000000000000000000000000000';
        const krestTotalSupply = ethers.utils.parseUnits('400000000', 18);

        const factoryContract = new ethers.Contract('0x23aAC8C182b2C2a2387868ee98C1544bF705c097', UniswapV2FactoryABI, provider);
        const pairCount = await factoryContract.allPairsLength();

        const burnedTokens = {};

        const WKREST_ADDRESS = "0xdd11f4e48ce3a2b9043b2b0758ce704d3Fd191dc";
        const KRST_SYMBOL = "KRST";

        for (let i = 0; i < pairCount; i++) {
            const pairAddress = await factoryContract.allPairs(i);
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);

            let token0 = await pairContract.token0();
            let token1 = await pairContract.token1();

            if (tokens[token0] && tokens[token0].symbol === KRST_SYMBOL) {
                token0 = WKREST_ADDRESS;
            }
            if (tokens[token1] && tokens[token1].symbol === KRST_SYMBOL) {
                token1 = WKREST_ADDRESS;
            }

            for (const tokenAddress in tokens) {
                let tokenDetails = tokens[tokenAddress];
                let { symbol } = tokenDetails;

                if (token0 === tokenAddress || token1 === tokenAddress) {
                    const lpBurnedBalance = await pairContract.balanceOf(nullAddress);
                    const reserves = await pairContract.getReserves();

                    const totalSupply = await pairContract.totalSupply();
                    const tokenReserve = token0 === tokenAddress ? reserves[0] : reserves[1];

                    if (!lpBurnedBalance || !totalSupply || !tokenReserve) {
                        console.error(`Invalid values encountered for token ${symbol} at address ${tokenAddress}`);
                        continue;
                    }

                    const tokenInBurnedLP = lpBurnedBalance.mul(tokenReserve).div(totalSupply);

                    if (!burnedTokens[symbol]) {
                        burnedTokens[symbol] = ethers.BigNumber.from(0);
                    }
                    burnedTokens[symbol] = burnedTokens[symbol].add(tokenInBurnedLP);

                    console.log(`Burned LP for ${symbol}: ${ethers.utils.formatUnits(tokenInBurnedLP, 18)}`);
                }
            }
        }

        for (const tokenAddress in tokens) {
            const tokenDetails = tokens[tokenAddress];
            const { symbol, logo } = tokenDetails;

            try {
                let totalSupply, circulatingSupply, userBalance, burnedPercentage, userShare, totalBurnedTokens;
                let burnedPercentageFormatted = '0.00';

                if (symbol === 'KRST') {
                    totalSupply = krestTotalSupply;
                    circulatingSupply = await fetchKRESTCirculatingSupply();
                    console.log(`Initial Circulating Supply of KRST: ${circulatingSupply.toString()}`);

                    const wkrestBurnedTokens = burnedTokens['WKREST'] || ethers.BigNumber.from(0);
                    circulatingSupply = circulatingSupply.sub(wkrestBurnedTokens);

                    userBalance = await provider.getBalance(address);
                    totalBurnedTokens = wkrestBurnedTokens;

                    console.log(`User Balance of KRST: ${ethers.utils.formatUnits(userBalance, 18)}`);
                    console.log(`Total Burned Tokens (WKREST): ${ethers.utils.formatUnits(totalBurnedTokens, 18)}`);

                    let scaledTotalSupply = Number(ethers.utils.formatUnits(totalSupply, 18));
                    let scaledBurnedTokens = Number(ethers.utils.formatUnits(totalBurnedTokens, 18));
                    
                    burnedPercentage = (scaledBurnedTokens * 100) / scaledTotalSupply;

                    if (burnedPercentage < 0.01) {
                        burnedPercentageFormatted = '<0.01';
                    } else {
                        burnedPercentageFormatted = burnedPercentage.toFixed(2);
                    }

                    let scaledUserBalance = Number(ethers.utils.formatUnits(userBalance, 18));
                    userShare = (scaledUserBalance * 100) / scaledTotalSupply;

                    if (userShare < 0.01) {
                        userShare = '<0.01';
                    } else {
                        userShare = userShare.toFixed(2);
                    }

                } else {
                    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
                    totalSupply = await tokenContract.totalSupply();
                    const burnedBalance = await tokenContract.balanceOf(nullAddress);
                    userBalance = await tokenContract.balanceOf(address);

                    if (!burnedBalance || !totalSupply) {
                        console.error(`Invalid values encountered for token ${symbol} at address ${tokenAddress}`);
                        continue;
                    }

                    totalBurnedTokens = burnedBalance.add(burnedTokens[symbol] || ethers.BigNumber.from(0));
                    circulatingSupply = totalSupply.sub(totalBurnedTokens);
                    burnedPercentage = totalBurnedTokens.mul(10000).mul(ethers.BigNumber.from(10).pow(18)).div(totalSupply);
                    burnedPercentageFormatted = Number(ethers.utils.formatUnits(burnedPercentage, 20)).toFixed(2);

                    userShare = userBalance.mul(10000).div(totalSupply);
                    userShare = userShare < 0.01 ? '<0.01' : Number(ethers.utils.formatUnits(userShare, 2)).toFixed(2);
                }

                data.push({
                    symbol,
                    logo,
                    totalSupply: symbol === 'KRST' ? '400,000,000' : Number(ethers.utils.formatUnits(totalSupply, 18)).toFixed(6),
                    circulatingSupply: circulatingSupply.isZero() ? '0.00' : Number(ethers.utils.formatUnits(circulatingSupply, 18)).toFixed(6),
                    userBalance: Number(ethers.utils.formatUnits(userBalance, 18)).toFixed(6),
                    burnedPercentage: burnedPercentageFormatted,
                    totalBurnedTokens: Number(ethers.utils.formatUnits(totalBurnedTokens, 18)).toFixed(6),
                    userShare,
                    tokenAddress: tokenAddress,
                });
            } catch (error) {
                console.error(`Error fetching data for token ${symbol} at address ${tokenAddress}:`, error);
            }
        }

        setTokenData(data);
    };

    return (
        <TableContainer>
            <StyledTable>
                <thead>
                    <tr>
                        <th>Logo</th>
                        <th>Symbol</th>
                        <th>Total Supply</th>
                        <th>Circulating Supply</th>
                        <th>Your Balance</th>
                        <th>Your % of Total Supply</th>
                        <th>Tokens 🔥 or in 🔥 LP</th>
                        <th>% Total Supply 🔥</th>
                    </tr>
                </thead>
                <tbody>
                    {tokenData.map((token, index) => (
                        <tr key={index}>
                            <LogoCell>
                                <a
                                    href={
                                        token.symbol === 'KRST'
                                            ? `https://krest.subscan.io/account/${address}`
                                            : `https://krest.subscan.io/account/${token.tokenAddress}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <img src={token.logo} alt={token.symbol} />
                                </a>
                            </LogoCell>
                            <td>
                                <a
                                    href={
                                        token.symbol === 'KRST'
                                            ? `https://krest.subscan.io/account/${address}`
                                            : `https://krest.subscan.io/account/${token.tokenAddress}`
                                    } target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {token.symbol}
                                </a>
                            </td>
                            <td>{token.totalSupply}</td>
                            <td>{token.circulatingSupply}</td>
                            <td>{token.userBalance}</td>
                            <PercentageCell percentage={token.userShare}>
                                {token.userShare}%
                            </PercentageCell>
                            <td>{token.totalBurnedTokens}</td>
                            <PercentageCell percentage={token.burnedPercentage}>
                                {token.burnedPercentage}%
                            </PercentageCell>
                        </tr>
                    ))}
                </tbody>
            </StyledTable>
        </TableContainer>
    );
};

export default TokenBalances;
