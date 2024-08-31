import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import { useAccount, useProvider } from 'wagmi';
import axios from 'axios';
import { TokenContext } from '../contexts/TokenContext';
import { ABIContext } from '../contexts/ABIContext';
import { KRESTPriceContext } from '../contexts/KRESTPriceContext';
import { DashboardContainer, Table, TableRow, TableCell, LoadingSpinner, ErrorMessage, InfoContainer, InfoItem, InfoLabel, InfoValue, TableHead } from '../styles/FeesDashboardStyles';
import { TokenPairsContext } from '../contexts/TokenPairsContext';

const FeesDashboard = () => {
  const { tokens } = useContext(TokenContext);
  const { ERC20ABI, UniswapV2PairABI, DSFONFTABI } = useContext(ABIContext);
  const { address: userAddress } = useAccount();
  const provider = useProvider();
  const { krestPrice } = useContext(KRESTPriceContext);
  const { tokenPairs } = useContext(TokenPairsContext);
  const [totalFees, setTotalFees] = useState({});
  const [userFees, setUserFees] = useState({});
  const [usdFees, setUsdFees] = useState({});
  const [dexOverallUsdFees, setDexOverallUsdFees] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dsfoNFTCount, setDsfoNFTCount] = useState(0);
  const [ownershipPercentage, setOwnershipPercentage] = useState(0);
  const [blockNumber, setBlockNumber] = useState(0);
  const [calculationsDone, setCalculationsDone] = useState(false);

  const DSFOContractAddress = '0x83aa476fe09a925711cac050dc8320b4256b398c';

  useEffect(() => {
    document.body.style.backgroundImage = 'url("/src/assets/donnyswap_treasury.png")';
    document.body.style.backgroundSize = '100% 100%';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    return () => {
        document.body.style.backgroundImage = 'url("/src/assets/donnyswap_treasury.png")';
    };
}, []);

  // Fetch NFT Data
  useEffect(() => {
    const fetchNFTData = async () => {
      try {
        if (!userAddress || !provider) return;

        const dsfoContract = new ethers.Contract(DSFOContractAddress, DSFONFTABI, provider);
        const nftCount = await dsfoContract.balanceOf(userAddress);
        setDsfoNFTCount(parseInt(nftCount.toString()));

        const totalSupply = await dsfoContract.totalSupply();
        const ownershipPct = (parseInt(nftCount.toString()) / parseInt(totalSupply.toString())) * 100;
        setOwnershipPercentage(ownershipPct.toFixed(2));
      } catch (error) {
        console.error('Error fetching NFT data:', error);
      }
    };

    if (userAddress && provider) {
      fetchNFTData();
    }
  }, [userAddress, provider, DSFONFTABI]);

  // Fetch and Update Block Number
  useEffect(() => {
    if (provider) {
      const updateBlockNumber = async () => {
        const blockNumber = await provider.getBlockNumber();
        setBlockNumber(blockNumber);
      };

      const interval = setInterval(updateBlockNumber, 1000);
      return () => clearInterval(interval);
    }
  }, [provider]);

  // Fetch All Fees Data from API (for all users)
  useEffect(() => {
    const fetchAllFees = async () => {
      try {
        const response = await axios.get(`https://donnyswap.betterfuturelabs.xyz/api/getAllFees`);
        console.log('All Fees API Response:', response.data);
        const allFees = response.data;

        let accumulatedTotalFees = {};

        // Accumulate fees per token for all users by token symbol
        allFees.forEach((fee) => {
          const tokenSymbol = fee.token_symbol;

          if (!accumulatedTotalFees[tokenSymbol]) {
            accumulatedTotalFees[tokenSymbol] = parseFloat(fee.fees_amount);
          } else {
            accumulatedTotalFees[tokenSymbol] += parseFloat(fee.fees_amount);
          }
        });

        setTotalFees(accumulatedTotalFees);
      } catch (error) {
        console.error('Error fetching all fees data:', error);
      }
    };

    fetchAllFees();
  }, []);

  // Fetch User-Specific Fees from API
  useEffect(() => {
    const fetchUserFees = async () => {
      try {
        if (!userAddress || !provider) return;

        const response = await axios.get(`https://donnyswap.betterfuturelabs.xyz/api/getFees/${userAddress}`);
        console.log('User Fees API Response:', response.data);
        const userFeesData = response.data;

        let accumulatedUserFees = {};

        // Accumulate fees per token for the specific user by token symbol
        userFeesData.forEach((fee) => {
          const tokenSymbol = fee.token_symbol;

          if (!accumulatedUserFees[tokenSymbol]) {
            accumulatedUserFees[tokenSymbol] = parseFloat(fee.fees_amount);
          } else {
            accumulatedUserFees[tokenSymbol] += parseFloat(fee.fees_amount);
          }
        });

        setUserFees(accumulatedUserFees);
      } catch (error) {
        console.error('Error fetching user fees data:', error);
        setErrorMessage('Error fetching fees data.');
        setLoading(false);
      }
    };

    if (userAddress && provider) {
      fetchUserFees();
    }
  }, [provider]);

  // Calculate USD Values for Total Fees (All Users)
  useEffect(() => {
    const calculateTotalUsdFees = async () => {
      if (!tokens || !tokenPairs || !krestPrice) {
        console.error("Tokens, token pairs, or KREST price context is not populated.");
        return;
      }

      let dexOverallUsdFeesTemp = {};

      for (const [symbol, totalAmount] of Object.entries(totalFees)) {
        let dexUsdValue = 0;

        // Skip KRST tokens
        if (symbol === 'KRST') {
          console.log(`Skipping token: ${symbol}`);
          continue;
        }

        // Find the token address
        const tokenData = Object.values(tokens).find(token => token.symbol === symbol);

        if (!tokenData) {
          console.error(`Token data for symbol ${symbol} not found.`);
          continue;
        }

        if (symbol === 'WKREST') {
          dexUsdValue = totalAmount * krestPrice;
        } else {
          for (const pairAddress in tokenPairs) {
            const pair = tokenPairs[pairAddress];

            if (
              pair.token1_address === tokenData.address ||
              pair.token2_address === tokenData.address
            ) {
              const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
              const [reserve0, reserve1] = await pairContract.getReserves();

              let reserveWKREST;
              let reserveToken;

              if (pair.token1_address === '0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc') {
                reserveWKREST = parseFloat(ethers.utils.formatUnits(reserve0, 18));
                reserveToken = parseFloat(ethers.utils.formatUnits(reserve1, tokenData.decimals));
              } else {
                reserveWKREST = parseFloat(ethers.utils.formatUnits(reserve1, 18));
                reserveToken = parseFloat(ethers.utils.formatUnits(reserve0, tokenData.decimals));
              }

              const priceOfTokenInWKREST = reserveWKREST / reserveToken;

              dexUsdValue = priceOfTokenInWKREST * krestPrice * totalAmount;
              break;
            }
          }
        }

        dexOverallUsdFeesTemp[symbol] = {
          amount: totalAmount.toFixed(6),
          usd: dexUsdValue.toFixed(2),
          logo: tokens[tokenData.address].logo,
        };
      }

      setDexOverallUsdFees(dexOverallUsdFeesTemp);
    };

    if (Object.keys(totalFees).length > 0) {
      calculateTotalUsdFees();
    }
  }, [totalFees, tokens, tokenPairs, krestPrice]);

  // Calculate USD Values for User Fees
  useEffect(() => {
    const calculateUserUsdFees = async () => {
      if (!tokens || !tokenPairs || !krestPrice) {
        console.error("Tokens, token pairs, or KREST price context is not populated.");
        return;
      }

      let usdFeesTemp = {};

      for (const [symbol, userAmount] of Object.entries(userFees)) {
        let userUsdValue = 0;

        // Skip KRST tokens
        if (symbol === 'KRST') {
          console.log(`Skipping token: ${symbol}`);
          continue;
        }

        // Find the token address
        const tokenData = Object.values(tokens).find(token => token.symbol === symbol);

        if (!tokenData) {
          console.error(`Token data for symbol ${symbol} not found.`);
          continue;
        }

        if (symbol === 'WKREST') {
          userUsdValue = userAmount * krestPrice;
        } else {
          for (const pairAddress in tokenPairs) {
            const pair = tokenPairs[pairAddress];

            if (
              pair.token1_address === tokenData.address ||
              pair.token2_address === tokenData.address
            ) {
              const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, provider);
              const [reserve0, reserve1] = await pairContract.getReserves();

              let reserveWKREST;
              let reserveToken;

              if (pair.token1_address === '0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc') {
                reserveWKREST = parseFloat(ethers.utils.formatUnits(reserve0, 18));
                reserveToken = parseFloat(ethers.utils.formatUnits(reserve1, tokenData.decimals));
              } else {
                reserveWKREST = parseFloat(ethers.utils.formatUnits(reserve1, 18));
                reserveToken = parseFloat(ethers.utils.formatUnits(reserve0, tokenData.decimals));
              }

              const priceOfTokenInWKREST = reserveWKREST / reserveToken;

              userUsdValue = priceOfTokenInWKREST * krestPrice * userAmount;
              break;
            }
          }
        }

        usdFeesTemp[symbol] = {
          amount: userAmount.toFixed(6),
          usd: userUsdValue.toFixed(2),
          logo: tokens[tokenData.address].logo,
        };
      }

      setUsdFees(usdFeesTemp);
      setCalculationsDone(true);
      setLoading(false); // Ensure loading is set to false once calculations are done
    };

    if (Object.keys(userFees).length > 0) {
      calculateUserUsdFees();
    }
  }, [userFees, tokens, tokenPairs, krestPrice]);

  return (
    <DashboardContainer>
      {loading || !calculationsDone ? (
        <LoadingSpinner>
          <img src="src/assets/MRBL_logo.png" alt="Loading" />
          <p>Fetching your Marbles...</p>
        </LoadingSpinner>
      ) : errorMessage ? (
        <ErrorMessage>{errorMessage}</ErrorMessage>
      ) : (
        <>
          <InfoContainer>
            <InfoItem>
              <InfoLabel>Your DSFO NFT Count:</InfoLabel>
              <InfoValue>{dsfoNFTCount}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>KREST PRICE:</InfoLabel>
              <InfoValue>${krestPrice.toFixed(6)}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Your % Ownership of the DEX:</InfoLabel>
              <InfoValue>{ownershipPercentage}%</InfoValue>
            </InfoItem>
          </InfoContainer>
          {Object.keys(totalFees).length === 0 ? (
            <ErrorMessage>No fees data available to display.</ErrorMessage>
          ) : (
            <Table>
              <thead>
                <TableRow>
                  <TableHead>Total DEX Fees Overall</TableHead>
                  <TableHead>Total DEX Fees in USD</TableHead>
                  <TableHead>Your Total Fees Earned</TableHead>
                  <TableHead>Your Fees Earned in USD</TableHead>
                </TableRow>
              </thead>
              <tbody>
                {Object.entries(totalFees).map(([symbol, amount]) => (
                  <TableRow key={symbol}>
                    <TableCell>
                      <img src={dexOverallUsdFees[symbol]?.logo} alt={`${symbol} logo`} /> {dexOverallUsdFees[symbol]?.amount} <b>{symbol}</b>
                    </TableCell>
                    <TableCell>
                      {(dexOverallUsdFees[symbol]?.usd < 0.01 ? '<0.01' : dexOverallUsdFees[symbol]?.usd) || 'N/A'} USD
                    </TableCell>
                    <TableCell>
                      <img src={usdFees[symbol]?.logo} alt={`${symbol} logo`} /> {usdFees[symbol]?.amount} <b>{symbol}</b>
                    </TableCell>
                    <TableCell>
                      {(usdFees[symbol]?.usd < 0.01 ? '<0.01' : usdFees[symbol]?.usd) || 'N/A'} USD
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </DashboardContainer>
  );
};

export default FeesDashboard;
