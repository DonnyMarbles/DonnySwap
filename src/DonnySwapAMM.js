import React, { useState, useEffect } from 'react';
import {
    GlobalStyle,
    FormContainer,
    ButtonContainer,
    ToggleButton,
    SectionTitle,
    SelectContainer,
    Select,
    TokenOption,
    BalanceContainer,
    Balance,
    Input,
    Button,
    SwapSection,
    SwapInput,
    UsdValue,
    Label,
    SlippageContainer,
    SlippageInput,
    ExchangeRateContainer,
    ExchangeRate,
    ExchangeRateInfo,
    ExchangeRateToken,
    SwapButton,
    RefreshButton,
    LPTokenBalance
} from './StyledComponents';
import web3 from './web3';
import UniswapV2Router02ABI from './UniswapV2Router02ABI.json';
import UniswapV2PairABI from './UniswapV2PairABI.json';
import tokenList from './tokenList.json';
import ERC20ABI from './ERC20ABI.json';
import UniswapV2FactoryABI from './UniswapV2FactoryABI.json';
import fetchKRESTPrice from './fetchKRESTPrice'; // Import fetchKRESTPrice utility
import PriceImpact from './PriceImpact';

const routerAddress = '0x107f729a0ca77F39901f073eC2104a3B736623f6';
const factoryAddress = '0xE8b18dDde112F880607062EDF3DC6B3078FfE46F';

const DonnySwapAMM = () => {
    const [view, setView] = useState('swapTokens'); // Default to 'swapTokens'
    const [tokenA, setTokenA] = useState('');
    const [tokenB, setTokenB] = useState('');
    const [sellAmount, setSellAmount] = useState('');
    const [buyAmount, setBuyAmount] = useState('');
    const [slippage, setSlippage] = useState(0.5); // Default slippage
    const [exchangeRate, setExchangeRate] = useState(null);
    const [balanceA, setBalanceA] = useState('');
    const [balanceB, setBalanceB] = useState('');
    const [lpBalance, setLpBalance] = useState(''); // State for LP token balance
    const [usdValueA, setUsdValueA] = useState(0);
    const [usdValueB, setUsdValueB] = useState(0);
    const [krestPrice, setKrestPrice] = useState(null); // State for KREST price
    const [suggestedSlippage, setSuggestedSlippage] = useState(0.5);
    const [isSwapDisabled, setIsSwapDisabled] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [priceImpact, setPriceImpact] = useState(0);

    let routerContract;

    try {
        routerContract = new web3.eth.Contract(UniswapV2Router02ABI, routerAddress);
    } catch (error) {
        console.error('Failed to create contract instance:', error);
    }

    const fetchBalance = async (token, setBalance) => {
        if (token) {
            try {
                const accounts = await web3.eth.getAccounts();
                const tokenContract = new web3.eth.Contract(ERC20ABI, token);
                const balance = await tokenContract.methods.balanceOf(accounts[0]).call();
                setBalance(web3.utils.fromWei(balance, 'ether'));
            } catch (error) {
                console.error('Error fetching balance:', error);
            }
        }
    };

    const fetchLPTokenBalance = async () => {
        if (tokenA && tokenB) {
            try {
                const factoryContract = new web3.eth.Contract(UniswapV2FactoryABI, factoryAddress);
                const pairAddress = await factoryContract.methods.getPair(tokenA, tokenB).call();
                const accounts = await web3.eth.getAccounts();
                const lpTokenContract = new web3.eth.Contract(ERC20ABI, pairAddress);
                const balance = await lpTokenContract.methods.balanceOf(accounts[0]).call();
                setLpBalance(web3.utils.fromWei(balance, 'ether'));
            } catch (error) {
                console.error('Error fetching LP token balance:', error);
                setLpBalance('');
            }
        }
    };

    const simulateTransaction = async () => {
        if (tokenA && tokenB && sellAmount) {
            try {
                const amountsOut = await routerContract.methods.getAmountsOut(web3.utils.toWei(sellAmount, 'ether'), [tokenA, tokenB]).call();
                const calculatedBuyAmount = parseFloat(web3.utils.fromWei(amountsOut[1], 'ether'));
                const minAmountOut = calculatedBuyAmount * (1 - slippage / 100);

                if (minAmountOut < parseFloat(buyAmount)) {
                    setIsSwapDisabled(true);
                    setErrorMessage(`Raise Slippage to ${(parseFloat(buyAmount) / calculatedBuyAmount * 100 - 100).toFixed(2)}%`);
                    setSuggestedSlippage((parseFloat(buyAmount) / calculatedBuyAmount * 100 - 100).toFixed(2));
                } else {
                    setIsSwapDisabled(false);
                    setErrorMessage('');
                }
            } catch (error) {
                console.error('Error simulating transaction:', error);
            }
        }
    };

    const handleSuggestedSlippage = () => {
        setSlippage(suggestedSlippage);
        setIsSwapDisabled(false);
        setErrorMessage('');
    };

    const fetchReserves = async (tokenA, tokenB) => {
        const factoryContract = new web3.eth.Contract(UniswapV2FactoryABI, factoryAddress);
        const pairAddress = await factoryContract.methods.getPair(tokenA, tokenB).call();
        const pairContract = new web3.eth.Contract(UniswapV2PairABI, pairAddress);
        const reserves = await pairContract.methods.getReserves().call();
        return reserves;
    };

    const calculatePriceImpact = (reserveA, reserveB, amountIn) => {
        const newReserveA = reserveA + parseFloat(amountIn);
        const newReserveB = reserveB * reserveA / newReserveA;
        const priceImpact = ((reserveB / reserveA) - (newReserveB / newReserveA)) / (reserveB / reserveA) * 100;
        return priceImpact;
    };

    useEffect(() => {
        const updatePriceImpact = async () => {
            if (tokenA && tokenB && sellAmount) {
                const reserves = await fetchReserves(tokenA, tokenB);
                const impact = calculatePriceImpact(parseFloat(reserves[0]), parseFloat(reserves[1]), sellAmount);
                setPriceImpact(impact);
            }
        };
        updatePriceImpact();
    }, [tokenA, tokenB, sellAmount]);

    useEffect(() => {
        simulateTransaction();
    }, [sellAmount, buyAmount, slippage]);

    useEffect(() => {
        const fetchExchangeRate = async () => {
            if (tokenA && tokenB) {
                try {
                    const amountsOut = await routerContract.methods.getAmountsOut(web3.utils.toWei('1', 'ether'), [tokenA, tokenB]).call();
                    setExchangeRate(parseFloat(web3.utils.fromWei(amountsOut[1], 'ether')).toFixed(8));
                } catch (error) {
                    console.error('Error fetching exchange rate:', error);
                }
            }
        };

        fetchExchangeRate();
    }, [tokenA, tokenB, routerContract.methods]);

    useEffect(() => {
        fetchBalance(tokenA, setBalanceA);
        fetchBalance(tokenB, setBalanceB);
        fetchLPTokenBalance();
    }, [tokenA, tokenB]);

    useEffect(() => {
        const getKrestPrice = async () => {
            const price = await fetchKRESTPrice();
            if (price) {
                setKrestPrice(price);
            } else {
                console.error('Failed to fetch KREST price');
            }
        };

        getKrestPrice();
    }, []);

    useEffect(() => {
        if (sellAmount && exchangeRate) {
            try {
                const calculatedBuyAmount = (parseFloat(sellAmount) * parseFloat(exchangeRate) * (1 - slippage / 100)).toFixed(8);
                setBuyAmount(calculatedBuyAmount);
            } catch (error) {
                console.error('Error calculating buy amount:', error);
                setBuyAmount('');
            }
        } else {
            setBuyAmount('');
        }
    }, [sellAmount, exchangeRate, slippage]);

    useEffect(() => {
        if (sellAmount && krestPrice) {
            try {
                setUsdValueA((sellAmount * krestPrice).toFixed(2));
                setUsdValueB((buyAmount * krestPrice).toFixed(2));
            } catch (error) {
                console.error('Error fetching USD value:', error);
            }
        } else {
            setUsdValueA(0);
            setUsdValueB(0);
        }
    }, [sellAmount, buyAmount, krestPrice]);

    const handleAddLiquidity = async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            await routerContract.methods.addLiquidity(
                tokenA,
                tokenB,
                web3.utils.toWei(sellAmount, 'ether'),
                web3.utils.toWei(buyAmount, 'ether'),
                0,
                0,
                accounts[0],
                Math.floor(Date.now() / 1000) + 60 * 20
            ).send({ from: accounts[0] });
        } catch (error) {
            console.error('Error adding liquidity:', error);
        }
    };

    const handleSwapTokens = async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const amountIn = web3.utils.toWei(sellAmount, 'ether');
            const amountOutMin = web3.utils.toWei((buyAmount * (1 - slippage / 100)).toString(), 'ether');

            if (tokenB === '0x0f0e911f048b8c2468defa7b01d4df5e59123414') { // WKREST token address
                // Swap to WKREST
                await routerContract.methods.swapExactTokensForETH(
                    amountIn,
                    amountOutMin,
                    [tokenA, tokenB],
                    accounts[0],
                    Math.floor(Date.now() / 1000) + 60 * 20
                ).send({ from: accounts[0] });
            } else {
                // General swap
                await routerContract.methods.swapExactTokensForTokens(
                    amountIn,
                    amountOutMin,
                    [tokenA, tokenB],
                    accounts[0],
                    Math.floor(Date.now() / 1000) + 60 * 20
                ).send({ from: accounts[0] });
            }
        } catch (error) {
            console.error('Error swapping tokens:', error);
        }
    };

    const handleSwapDropdownTokens = () => {
        const tempToken = tokenA;
        setTokenA(tokenB);
        setTokenB(tempToken);
    };

    const refreshBalances = async () => {
        fetchBalance(tokenA, setBalanceA);
        fetchBalance(tokenB, setBalanceB);
        fetchLPTokenBalance();
    };

    return (
        <>
            <GlobalStyle />
            <FormContainer>
                <ButtonContainer>
                    <ToggleButton onClick={() => setView('addLiquidity')} active={view === 'addLiquidity'}>
                        Add Liquidity
                    </ToggleButton>
                    <ToggleButton onClick={() => setView('swapTokens')} active={view === 'swapTokens'}>
                        Swap Tokens
                    </ToggleButton>
                    <RefreshButton onClick={refreshBalances}>Refresh 🔄</RefreshButton>
                </ButtonContainer>

                {view === 'addLiquidity' ? (
                    <>
                        <SectionTitle>Add Liquidity</SectionTitle>
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
                            {balanceA && (
                                <BalanceContainer>
                                    <img src={tokenList[tokenA]?.logo} alt={tokenList[tokenA]?.symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                    <Balance>Balance: {balanceA}</Balance>
                                </BalanceContainer>
                            )}
                        </SelectContainer>
                        <Input value={sellAmount} onChange={e => setSellAmount(e.target.value)} placeholder="Amount A Desired" />
                        <SwapButton onClick={handleSwapDropdownTokens}>⇅</SwapButton>
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
                            {balanceB && (
                                <BalanceContainer>
                                    <img src={tokenList[tokenB]?.logo} alt={tokenList[tokenB]?.symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                    <Balance>Balance: {balanceB}</Balance>
                                </BalanceContainer>
                            )}
                        </SelectContainer>
                        <Input value={buyAmount} onChange={e => setBuyAmount(e.target.value)} placeholder="Amount B Desired" />
                        {exchangeRate && (
                            <ExchangeRateContainer>
                                <ExchangeRate>
                                    1 {tokenList[tokenA]?.symbol} = {exchangeRate} {tokenList[tokenB]?.symbol}
                                </ExchangeRate>
                            </ExchangeRateContainer>
                        )}
                        <Button onClick={handleAddLiquidity}>Add Liquidity</Button>
                        {lpBalance && (
                            <LPTokenBalance>
                                LP Token Balance: {lpBalance}
                            </LPTokenBalance>
                        )}
                    </>
                ) : (
                    <>
                        <SectionTitle>Swap Tokens</SectionTitle>
                        <SwapSection>
                            <Label>Sell</Label>
                            <SwapInput value={sellAmount} onChange={e => {
                                const value = e.target.value;
                                setSellAmount(value);
                                const calculatedImpact = (parseFloat(value) - (parseFloat(buyAmount) / parseFloat(exchangeRate))) / parseFloat(value) * 100;
                                setPriceImpact(calculatedImpact);
                            }} placeholder="Amount A Desired" />
                            <UsdValue>${usdValueA}</UsdValue>
                        </SwapSection>
                        <SelectContainer>
                            <Select value={tokenA} onChange={e => setTokenA(e.target.value)} placeholder="Select Token A">
                                <option value="">Select Token</option>
                                {Object.keys(tokenList).map(address => (
                                    <option key={address} value={address}>
                                        <TokenOption>
                                            <img src={tokenList[address].logo} alt={tokenList[address].symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                            {tokenList[address].symbol}
                                        </TokenOption>
                                    </option>
                                ))}
                            </Select>
                            {balanceA && (
                                <BalanceContainer>
                                    <img src={tokenList[tokenA]?.logo} alt={tokenList[tokenA]?.symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                    <Balance onClick={() => setSellAmount(balanceA)}>Balance: {balanceA}</Balance>
                                </BalanceContainer>
                            )}
                        </SelectContainer>
                        <SwapButton onClick={handleSwapDropdownTokens}>⇅</SwapButton>
                        <SwapSection>
                            <Label>Buy</Label>
                            <SwapInput value={buyAmount} onChange={e => setBuyAmount(e.target.value)} readOnly placeholder="Buy Amount" />
                            <UsdValue>${usdValueB}</UsdValue>
                        </SwapSection>
                        <SelectContainer>
                            <Select value={tokenB} onChange={e => setTokenB(e.target.value)} placeholder="Select Token B">
                                <option value="">Select Token</option>
                                {Object.keys(tokenList).filter(address => address !== tokenA).map(address => (
                                    <option key={address} value={address}>
                                        <TokenOption>
                                            <img src={tokenList[address].logo} alt={tokenList[address].symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                            {tokenList[address].symbol}
                                        </TokenOption>
                                    </option>
                                ))}
                            </Select>
                            {balanceB && (
                                <BalanceContainer>
                                    <img src={tokenList[tokenB]?.logo} alt={tokenList[tokenB]?.symbol} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                                    <Balance onClick={() => setBuyAmount(balanceB)}>Balance: {balanceB}</Balance>
                                </BalanceContainer>
                            )}
                        </SelectContainer>
                        <SlippageContainer>
                            <PriceImpact
                                tokenA={tokenA}
                                tokenB={tokenB}
                                sellAmount={sellAmount}
                                exchangeRate={exchangeRate}
                            />
                            <Label>Slippage Tolerance (%)</Label>
                            <SlippageInput value={slippage} onChange={e => setSlippage(e.target.value)} placeholder="0.5" />
                        </SlippageContainer>
                        <button onClick={handleSwapTokens} disabled={isSwapDisabled}>Swap Tokens</button>
                        {exchangeRate && (
                            <ExchangeRateInfo>
                                1 <ExchangeRateToken src={tokenList[tokenA]?.logo} alt={tokenList[tokenA]?.symbol} /> {tokenList[tokenA]?.symbol} = {exchangeRate} <ExchangeRateToken src={tokenList[tokenB]?.logo} alt={tokenList[tokenB]?.symbol} /> {tokenList[tokenB]?.symbol}
                            </ExchangeRateInfo>
                        )}
                    </>
                )}
            </FormContainer>
        </>
    );
};

export default DonnySwapAMM;
