import React, { useState, useEffect, useContext } from 'react';
import { Web3Context } from '../contexts/Web3Context';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import { ethers } from 'ethers';
import { TableContainer, StyledTable, LogoCell, PercentageCell } from '../styles/TokenPairsStyles';

const TokenPairs = () => {
    const { provider, account } = useContext(Web3Context);
    const { tokens } = useContext(TokenContext);
    const { UniswapV2PairABI, UniswapV2FactoryABI } = useContext(ABIContext);

    const [pairs, setPairs] = useState([]);
    const [blockNumber, setBlockNumber] = useState(0);

    useEffect(() => {
        if (provider) {
            const updateBlockNumber = async () => {
                const blockNumber = await provider.getBlockNumber();
                setBlockNumber(blockNumber);
            };

            const interval = setInterval(updateBlockNumber, 500);
            return () => clearInterval(interval);
        }
    }, [provider]);

    useEffect(() => {
        if (provider && account) {
            console.log('tokens object:', tokens); // Log the tokens object
            fetchPairs();
        }
    }, [provider, account, blockNumber]);

    const fetchPairs = async () => {
        const factoryContract = new ethers.Contract('0x23aAC8C182b2C2a2387868ee98C1544bF705c097', UniswapV2FactoryABI, provider);
        const pairCount = await factoryContract.allPairsLength();
        console.log(`Total pair count: ${pairCount}`);

        const pairsData = [];
        const wrappedKrestAddress = ethers.utils.getAddress('0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'); // Normalize address
        const nullAddress = '0x0000000000000000000000000000000000000000'; // Null address

        for (let i = 0; i < pairCount; i++) {
            const pairAddress = await factoryContract.allPairs(i);
            const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);

            const tokenAAddress = ethers.utils.getAddress(await pairContract.token0()); // Normalize address
            const tokenBAddress = ethers.utils.getAddress(await pairContract.token1()); // Normalize address
            console.log(`Token A address: ${tokenAAddress}`);
            console.log(`Token B address: ${tokenBAddress}`);

            // Determine token symbols and addresses, accounting for KRST
            const tokenSymbolA = tokenAAddress === wrappedKrestAddress ? 'KRST' : tokens[tokenAAddress]?.symbol;
            const tokenSymbolB = tokenBAddress === wrappedKrestAddress ? 'KRST' : tokens[tokenBAddress]?.symbol;
            console.log(`Token A symbol: ${tokenSymbolA}`);
            console.log(`Token B symbol: ${tokenSymbolB}`);

            if (
                (tokenSymbolA === 'KRST' && tokenSymbolB === 'WKREST') ||
                (tokenSymbolA === 'WKREST' && tokenSymbolB === 'KRST') ||
                (tokenSymbolA === tokenSymbolB)
            ) {
                console.warn(`Invalid pair skipped: ${tokenSymbolA}-${tokenSymbolB}`);
                continue;
            }

            if (!tokenSymbolA || !tokenSymbolB) {
                console.error(`Token symbol not found: ${tokenAAddress} or ${tokenBAddress}`);
                continue;
            }

            const tokenALogo = tokens[tokenAAddress]?.logo || '';
            const tokenBLogo = tokens[tokenBAddress]?.logo || '';

            const reserves = await pairContract.getReserves();
            const totalSupply = await pairContract.totalSupply();
            const userBalance = await pairContract.balanceOf(account);

            // Get the total balance that has been sent to the null address (burned)
            const burnedBalance = await pairContract.balanceOf(nullAddress);
            const burnedPercentage = (burnedBalance / totalSupply) * 100;

            const userShare = (userBalance / totalSupply) * 100;

            pairsData.push({
                tokenASymbol: tokenSymbolA,
                tokenBSymbol: tokenSymbolB,
                tokenALogo,
                tokenBLogo,
                reserves,
                totalSupply,
                userBalance,
                userShare,
                pairAddress,
                tokenAAddress,
                tokenBAddress,
                burnedBalance,
                burnedPercentage,  // Add the burned percentage to the data
            });
        }

        console.log('Pairs data:', pairsData);
        setPairs(pairsData);
    };

    return (
        <TableContainer>
            <StyledTable>
                <thead>
                    <tr>
                        <th>Pair's Logos</th>
                        <th>Symbol</th>
                        <th>Reserves</th>
                        <th>Total LP Tokens</th>
                        <th>Your LP Balance</th>
                        <th>Your LP Share %</th>
                        <th>Total LP Tokens 🔥 </th>
                        <th>% Total LP Tokens 🔥</th> {/* Updated column header for burned percentage */}
                    </tr>
                </thead>
                <tbody>
                    {pairs.map((pair, index) => (
                        <tr key={index}>
                            <LogoCell>
                                <a
                                    href={`https://krest.subscan.io/account/${pair.tokenAAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <img src={pair.tokenALogo} alt={pair.tokenASymbol} />
                                </a>
                                <a
                                    href={`https://krest.subscan.io/account/${pair.tokenBAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <img src={pair.tokenBLogo} alt={pair.tokenBSymbol} />
                                </a>
                            </LogoCell>
                            <td>
                                <a
                                    href={`https://krest.subscan.io/account/${pair.pairAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {pair.tokenASymbol}/{pair.tokenBSymbol}
                                </a>
                            </td>
                            <td>
                                {Number(ethers.utils.formatUnits(pair.reserves[0], 18)).toFixed(6)} <a
                                    href={`https://krest.subscan.io/account/${pair.tokenAAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                > {pair.tokenASymbol} </a> / {Number(ethers.utils.formatUnits(pair.reserves[1], 18)).toFixed(6)} <a
                                    href={`https://krest.subscan.io/account/${pair.tokenBAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                > {pair.tokenBSymbol} </a>
                            </td>
                            <td>{Number(ethers.utils.formatUnits(pair.totalSupply, 18)).toFixed(6)} <a
                                href={`https://krest.subscan.io/account/${pair.pairAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {pair.tokenASymbol}/{pair.tokenBSymbol}
                            </a></td>
                            <td>{Number(ethers.utils.formatUnits(pair.userBalance, 18)).toFixed(6)} <a
                                    href={`https://krest.subscan.io/account/${pair.pairAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {pair.tokenASymbol}/{pair.tokenBSymbol}
                                </a></td>
                            <PercentageCell percentage={pair.userShare}>
                                {pair.userShare.toFixed(2)}%
                            </PercentageCell>
                            <td>
                            {Number(ethers.utils.formatUnits(pair.burnedBalance, 18)).toFixed(6)}
                            </td>
                            <PercentageCell percentage={pair.burnedPercentage}>
                                {pair.burnedPercentage.toFixed(2)}%
                            </PercentageCell> {/* Updated cell for burned percentage */}
                        </tr>
                    ))}
                </tbody>
            </StyledTable>
        </TableContainer>
    );
};

export default TokenPairs;
