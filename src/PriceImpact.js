import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import web3 from './web3';
import UniswapV2PairABI from './UniswapV2PairABI.json';
import UniswapV2FactoryABI from './UniswapV2FactoryABI.json';

const PriceImpactContainer = styled.div`
    font-size: 16px;
    margin-top: 10px;
    color: ${props => (props.impact > 1 ? 'red' : 'green')};
    display: flex;
    justify-content: center;
`;
const PriceImpact = ({ tokenA, tokenB, sellAmount }) => {
    const [priceImpact, setPriceImpact] = useState(0);

    useEffect(() => {
        const fetchReservesAndCalculateImpact = async () => {
            if (tokenA && tokenB && sellAmount) {
                try {
                    const factoryAddress = '0x9B56B112BbD6343a8961a093315A9A60b8cB1F36'; // Replace with your factory address
                    const factoryContract = new web3.eth.Contract(UniswapV2FactoryABI, factoryAddress);
                    const pairAddress = await factoryContract.methods.getPair(tokenA, tokenB).call();
                    const pairContract = new web3.eth.Contract(UniswapV2PairABI, pairAddress);
                    const reserves = await pairContract.methods.getReserves().call();
                    const reserveA = reserves[0];
                    const reserveB = reserves[1];

                    const newReserveA = parseFloat(reserveA) + parseFloat(sellAmount);
                    const newReserveB = reserveB * reserveA / newReserveA;
                    const newPrice = newReserveB / newReserveA;
                    const initialPrice = reserveB / reserveA;

                    const impact = ((initialPrice - newPrice) / initialPrice) * 100;
                    setPriceImpact(impact);
                } catch (error) {
                    console.error('Error fetching reserves or calculating price impact:', error);
                }
            }
        };

        fetchReservesAndCalculateImpact();
    }, [tokenA, tokenB, sellAmount]);

    return (
        <PriceImpactContainer impact={priceImpact}>
            Price Impact: {priceImpact.toFixed(2)}%
        </PriceImpactContainer>
    );
};

export default PriceImpact;