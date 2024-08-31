import React, { useState, useEffect, useContext } from 'react';
import { useAccount, useProvider, useContractRead, usePrepareContractWrite, useContractWrite, useBlockNumber } from 'wagmi';
import { ethers } from 'ethers';
import { ABIContext } from '../contexts/ABIContext';
import axios from 'axios';
import { MintContainer, MintInfoContainer, MintButton, MintDetails, ErrorMessage, LoadingSpinner } from '../styles/MintDSFONFTStyles';

const MintDSFONFT = () => {
    useEffect(() => {
        document.body.style.backgroundImage = 'url("/src/assets/DSFO_Mint.jpg")';
        document.body.style.backgroundSize = '100% 100%';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        return () => {
            document.body.style.backgroundImage = 'url("/src/assets/DSFO_Mint.jpg")';
        };
    }, []);

    const dsfoContractAddress = '0x83aa476fe09a925711cac050dc8320b4256b398c';
    const mrblWkrestPairAddress = '0x9C2d342C54e081b95f0Dcd94a657dCeb827377bE';
    const provider = useProvider();
    const { address: userAddress } = useAccount();
    const { DSFONFTABI, UniswapV2PairABI, ERC20ABI } = useContext(ABIContext);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [approved, setApproved] = useState(false);
    const [ownershipPercentage, setOwnershipPercentage] = useState(null);
    const [totalWKRESTReceived, setTotalWKRESTReceived] = useState(null);
    const [totalMRBLReceived, setTotalMRBLReceived] = useState(null);

    // Log important addresses and variables
    useEffect(() => {
        console.log("User Address:", userAddress);
        console.log("DSFO Contract Address:", dsfoContractAddress);
        console.log("MRBL-WKREST Pair Address:", mrblWkrestPairAddress);
    }, [userAddress]);

    // Fetch fees from the API
    useEffect(() => {
        const fetchFees = async () => {
            if (userAddress) {
                try {
                    const response = await axios.get(`https://donnyswap.betterfuturelabs.xyz/api/getFees/${userAddress}`);
                    const fees = response.data;

                    let totalWKREST = ethers.BigNumber.from(0);
                    let totalMRBL = ethers.BigNumber.from(0);

                    fees.forEach(fee => {
                        if (fee.token_symbol === 'WKREST') {
                            totalWKREST = totalWKREST.add(ethers.utils.parseUnits(fee.fees_amount, 18));
                        } else if (fee.token_symbol === 'MRBL') {
                            totalMRBL = totalMRBL.add(ethers.utils.parseUnits(fee.fees_amount, 18));
                        }
                    });

                    setTotalWKRESTReceived(totalWKREST);
                    setTotalMRBLReceived(totalMRBL);

                    console.log("Total WKREST Received:", ethers.utils.formatUnits(totalWKREST, 18));
                    console.log("Total MRBL Received:", ethers.utils.formatUnits(totalMRBL, 18));

                } catch (error) {
                    console.error("Error fetching fees from API:", error);
                }
            }
        };

        fetchFees();
    }, [userAddress]);

    // Read the mint price from the DSFO contract
    const { data: mintPrice } = useContractRead({
        address: dsfoContractAddress,
        abi: DSFONFTABI,
        functionName: 'mintPrice',
        onSuccess: (data) => console.log("Mint Price:", ethers.utils.formatUnits(data, 18)),
        onError: (error) => console.error("Error fetching Mint Price:", error),
    });

    // Read the user's LP token balance from the MRBL-WKREST Pair contract
    const { data: lpTokenBalance } = useContractRead({
        address: mrblWkrestPairAddress,
        abi: UniswapV2PairABI,
        functionName: 'balanceOf',
        args: [userAddress],
        onSuccess: (data) => console.log("LP Token Balance:", ethers.utils.formatUnits(data, 18)),
        onError: (error) => console.error("Error fetching LP Token Balance:", error),
    });

    // Read the total supply of DSFO NFTs
    const { data: totalSupply } = useContractRead({
        address: dsfoContractAddress,
        abi: DSFONFTABI,
        functionName: 'totalSupply',
        onSuccess: (data) => console.log("Total Supply of DSFO NFTs:", data.toString()),
        onError: (error) => console.error("Error fetching Total Supply:", error),
    });

    // Read the user's total DSFO NFT balance
    const { data: nftBalance } = useContractRead({
        address: dsfoContractAddress,
        abi: DSFONFTABI,
        functionName: 'balanceOf',
        args: [userAddress],
        onSuccess: (data) => console.log("DSFO NFT Balance:", data.toString()),
        onError: (error) => console.error("Error fetching NFT Balance:", error),
    });

    // Check if the DSFO contract is approved to spend 5 tokens of the user's LP tokens
    const { data: allowance } = useContractRead({
        address: mrblWkrestPairAddress,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [userAddress, dsfoContractAddress],
        onSuccess: (data) => console.log("Allowance for DSFO Contract:", ethers.utils.formatUnits(data, 18)),
        onError: (error) => console.error("Error fetching Allowance:", error),
    });

    useEffect(() => {
        checkAllowance();
    }, [allowance, mintPrice]);

    const checkAllowance = () => {
        if (allowance && mintPrice) {
            console.log("Checking Allowance against required tokens...");
            const requiredTokens = ethers.utils.parseUnits("5", 18);
            const isApproved = allowance.gte(requiredTokens);
            console.log("Is Approved:", isApproved);
            setApproved(isApproved);
        }
    };

    // Calculate user's ownership percentage of the DSFO NFTs
    useEffect(() => {
        if (nftBalance && totalSupply) {
            console.log("Calculating Ownership Percentage...");
            const percentage = (nftBalance / totalSupply) * 100;
            setOwnershipPercentage(percentage.toFixed(2)); // Set percentage with 2 decimal places
            console.log("Ownership Percentage:", percentage.toFixed(2));
        }
    }, [nftBalance, totalSupply]);

    // Prepare the approve function for the DSFO contract to approve exactly 5 tokens
    const { config: approveConfig } = usePrepareContractWrite({
        address: mrblWkrestPairAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [dsfoContractAddress, ethers.utils.parseUnits("5", 18)], // Approve only 5 tokens
        onError: (error) => console.error("Error preparing approval:", error),
    });

    const { write: approve } = useContractWrite({
        ...approveConfig,
        onSuccess: () => {
            console.log("Approval successful, checking allowance...");
            checkAllowance(); // Recheck allowance after approval
        },
        onError: (error) => console.error("Error during approval:", error),
    });

    const handleApprove = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            if (!approve) throw new Error("Approval function not prepared.");
            console.log("Sending approval transaction...");
            await approve();
        } catch (error) {
            console.error("Approval error:", error);
            setErrorMessage(error.message || 'An error occurred during approval.');
        } finally {
            setLoading(false);
        }
    };

    // Prepare the mint function for DSFO contract
    const { config: mintConfig } = usePrepareContractWrite({
        address: dsfoContractAddress,
        abi: DSFONFTABI,
        functionName: 'mintDSFONFT',
        onError: (error) => console.error("Error preparing mint:", error),
    });

    const { write: mintDSFO } = useContractWrite({
        ...mintConfig,
        onSuccess: () => console.log("Mint successful"),
        onError: (error) => console.error("Error during minting:", error),
    });

    const handleMint = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            if (!mintDSFO) throw new Error("Minting function not prepared.");
            console.log("Sending mint transaction...");
            await mintDSFO();
        } catch (error) {
            console.error("Minting error:", error);
            setErrorMessage(error.message || 'An error occurred during minting.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MintContainer>
            <h3>Mint DSFO NFT</h3>
            <MintInfoContainer>
                <img src="https://ipfs.io/ipfs/QmRMq3psZ2vKUPM8djG3L3HpCKKucQEqXmHjMUgC6ZKx9y" alt="DSFO Mint" />
                <MintDetails>
                    Mint Price: {mintPrice ? ethers.utils.formatUnits(mintPrice, 18) : 'Loading...'} <img src='src/assets/WKREST_logo.png' width={18} alt="WKREST logo" /><img src='src/assets/MRBL_logo.png' width={18} alt="MRBL logo" /> WKREST-MRBL LP Tokens
                </MintDetails>
                <MintDetails>
                    Your LP Token Balance: {lpTokenBalance ? ethers.utils.formatUnits(lpTokenBalance, 18) : 'Loading...'} LP Tokens
                </MintDetails>
                <MintDetails>
                    Your DSFO NFT Balance: {nftBalance ? nftBalance.toString() : 'Loading...'} NFTs
                </MintDetails>
                <MintDetails>
                    Your Ownership Percentage of the DEX: {ownershipPercentage !== null ? ownershipPercentage + '%' : 'Loading...'}
                </MintDetails>
                <MintDetails>
                    Your Total WKREST DEX Fees earned: {totalWKRESTReceived
                        ? (
                            <>
                                {parseFloat(ethers.utils.formatUnits(totalWKRESTReceived, 18)).toFixed(6)} <img src='src/assets/WKREST_logo.png' width={18} alt="WKREST logo" /> WKREST
                                
                            </>
                        )
                        : 'Loading...'}
                </MintDetails>
                <MintDetails>
                    Your Total MRBL DEX Fees earned: {totalMRBLReceived
                        ? (
                            <>
                                {parseFloat(ethers.utils.formatUnits(totalMRBLReceived, 18)).toFixed(6)} <img src='src/assets/MRBL_logo.png' width={18} alt="MRBL logo" /> MRBL
                                
                            </>
                        )
                        : 'Loading...'}
                </MintDetails>

            </MintInfoContainer>
            {approved ? (
                <MintButton
                    onClick={handleMint}
                    disabled={
                        loading ||
                        !mintPrice ||
                        !lpTokenBalance ||
                        lpTokenBalance.lt(mintPrice)
                    }
                >
                    {loading ? <LoadingSpinner /> : 'Mint DSFO NFT'}
                </MintButton>
            ) : (
                <MintButton onClick={handleApprove} disabled={loading || !mintPrice}>
                    {loading ? <LoadingSpinner /> : 'Approve'}
                </MintButton>
            )}
            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        </MintContainer>
    );
};

export default MintDSFONFT;
