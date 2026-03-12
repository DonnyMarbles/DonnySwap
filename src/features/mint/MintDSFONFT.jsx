import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatUnits, parseUnits, getAddress } from 'viem';
import axios from 'axios';
import { useABI } from '../../contexts/ABIContext';
import {
  MintContainer,
  MintInfoContainer,
  MintButton,
  MintDetails,
  ErrorMessage,
  LoadingSpinner,
  MintQuantityInput,
} from '../../styles/MintDSFONFTStyles';
import { useWallet } from '../../contexts/WalletContext';
import { executeContractWrite } from '../../lib/viemHelpers';
import { apiUrl } from '../../constants/api';
import { DSFO_NFT_ADDRESS, MRBL_WPEAQ_PAIR_ADDRESS } from '../../constants/contracts';
import dsfoMintBackground from '../../assets/DSFO_Mint.jpg';
import dsfoNftImage from '../../assets/donny_ticket_final.jpg';
import WPEAQLogo from '../../assets/WPEAQ_logo.png';
import MRBLLogo from '../../assets/MRBL_logo.png';

const MintDSFONFT = () => {
    useEffect(() => {
        const previousStyles = {
            backgroundImage: document.body.style.backgroundImage,
            backgroundSize: document.body.style.backgroundSize,
            backgroundRepeat: document.body.style.backgroundRepeat,
            backgroundAttachment: document.body.style.backgroundAttachment,
        };

        document.body.style.backgroundImage = `url(${dsfoMintBackground})`;
        document.body.style.backgroundSize = '100% 100%';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        return () => {
            document.body.style.backgroundImage = previousStyles.backgroundImage;
            document.body.style.backgroundSize = previousStyles.backgroundSize;
            document.body.style.backgroundRepeat = previousStyles.backgroundRepeat;
            document.body.style.backgroundAttachment = previousStyles.backgroundAttachment;
        };
    }, []);

    const dsfoContractAddress = getAddress(DSFO_NFT_ADDRESS);
    const mrblWPEAQPairAddress = getAddress(MRBL_WPEAQ_PAIR_ADDRESS);
    const { publicClient, walletClient, address: userAddress } = useWallet();
    const { DSFONFTABI, UniswapV2PairABI, ERC20ABI } = useABI();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [approved, setApproved] = useState(false);
    const [ownershipPercentage, setOwnershipPercentage] = useState(null);
    const [totalWPEAQReceived, setTotalWPEAQReceived] = useState(null);
    const [totalMRBLReceived, setTotalMRBLReceived] = useState(null);
    const [blockNumber, setBlockNumber] = useState(null);
    const [mintPrice, setMintPrice] = useState(null);
    const [mintQuantity, setMintQuantity] = useState(1);
    const [lpTokenBalance, setLpTokenBalance] = useState(null);
    const [totalSupply, setTotalSupply] = useState(null);
    const [nftBalance, setNftBalance] = useState(null);
    const [allowance, setAllowance] = useState(null);
    const totalMintCost = useMemo(() => {
        if (mintPrice === null) {
            return null;
        }
        return mintPrice * BigInt(mintQuantity);
    }, [mintPrice, mintQuantity]);

    // Set up block number polling
    useEffect(() => {
        const fetchBlockNumber = async () => {
            if (!publicClient) return;
            const blockNum = await publicClient.getBlockNumber();
            setBlockNumber(Number(blockNum));
        };

        const intervalId = setInterval(fetchBlockNumber, 5000);
        fetchBlockNumber();

        return () => clearInterval(intervalId);
    }, [publicClient]);

    // Fetch fees from the API
    useEffect(() => {
        const fetchFees = async () => {
            if (userAddress) {
                try {
                    const response = await axios.get(apiUrl(`getFeesPEAQ/${userAddress}`));
                    const fees = response.data;

                    let totalWPEAQ = 0n;
                    let totalMRBL = 0n;

                    fees.forEach(fee => {
                        if (fee.token_symbol === 'WPEAQ') {
                            totalWPEAQ += parseUnits(fee.fees_amount, 18);
                        } else if (fee.token_symbol === 'MRBL') {
                            totalMRBL += parseUnits(fee.fees_amount, 18);
                        }
                    });

                    setTotalWPEAQReceived(totalWPEAQ);
                    setTotalMRBLReceived(totalMRBL);
                } catch (error) {
                    console.error("Error fetching fees from API:", error);
                }
            }
        };

        fetchFees();
    }, [userAddress]);

    const refreshContractState = useCallback(async () => {
        if (!publicClient) {
            return;
        }
        try {
            const dsfoContract = { address: dsfoContractAddress, abi: DSFONFTABI };
            const pairContract = { address: mrblWPEAQPairAddress, abi: UniswapV2PairABI };
            const lpTokenContract = { address: mrblWPEAQPairAddress, abi: ERC20ABI };

            const [price, supply, userNftBalance, userLpBalance, currentAllowance] =
                await Promise.all([
                    publicClient.readContract({ ...dsfoContract, functionName: 'mintPrice' }),
                    publicClient.readContract({ ...dsfoContract, functionName: 'totalSupply' }),
                    userAddress
                        ? publicClient.readContract({
                              ...dsfoContract,
                              functionName: 'balanceOf',
                              args: [userAddress],
                          })
                        : Promise.resolve(0n),
                    userAddress
                        ? publicClient.readContract({
                              ...pairContract,
                              functionName: 'balanceOf',
                              args: [userAddress],
                          })
                        : Promise.resolve(0n),
                    userAddress
                        ? publicClient.readContract({
                              ...lpTokenContract,
                              functionName: 'allowance',
                              args: [userAddress, dsfoContractAddress],
                          })
                        : Promise.resolve(0n),
                ]);

            setMintPrice(price);
            setTotalSupply(supply);
            setNftBalance(userNftBalance);
            setLpTokenBalance(userLpBalance);
            setAllowance(currentAllowance);
        } catch (error) {
            console.error('Error refreshing DSFO contract state:', error);
        }
    }, [publicClient, userAddress, DSFONFTABI, UniswapV2PairABI, ERC20ABI, dsfoContractAddress, mrblWPEAQPairAddress]);

    useEffect(() => {
        refreshContractState();
    }, [refreshContractState, blockNumber]);

    useEffect(() => {
        if (allowance !== null && totalMintCost !== null) {
            setApproved(allowance >= totalMintCost);
        } else {
            setApproved(false);
        }
    }, [allowance, totalMintCost]);

    useEffect(() => {
        if (nftBalance !== null && totalSupply !== null && totalSupply > 0n) {
            const owned = Number(nftBalance);
            const total = Number(totalSupply);
            if (total > 0) {
                const percentage = ((owned / total) * 100).toFixed(2);
                setOwnershipPercentage(percentage);
                return;
            }
        }
        setOwnershipPercentage(null);
    }, [nftBalance, totalSupply]);

    const handleQuantityChange = (event) => {
        const value = Number(event.target.value);
        if (Number.isNaN(value) || value < 1) {
            setMintQuantity(1);
            return;
        }
        setMintQuantity(Math.floor(value));
    };

    const handleApprove = async () => {
        if (!walletClient || !publicClient || !userAddress) {
            setErrorMessage('Please connect your wallet to approve.');
            return;
        }
        if (totalMintCost === null) {
            setErrorMessage('Mint price not available yet. Please try again.');
            return;
        }
        setLoading(true);
        setErrorMessage('');
        try {
            const amountToApprove = totalMintCost;
            await executeContractWrite({
                publicClient,
                walletClient,
                account: userAddress,
                address: mrblWPEAQPairAddress,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [dsfoContractAddress, amountToApprove],
            });
            const updatedAllowance = await publicClient.readContract({
                address: mrblWPEAQPairAddress,
                abi: ERC20ABI,
                functionName: 'allowance',
                args: [userAddress, dsfoContractAddress],
            });
            setAllowance(updatedAllowance);
        } catch (error) {
            console.error('Approval error:', error);
            setErrorMessage(error.message || 'An error occurred during approval.');
        } finally {
            setLoading(false);
        }
    };

    const handleMint = async () => {
        if (!walletClient || !publicClient || !userAddress) {
            setErrorMessage('Please connect your wallet to mint.');
            return;
        }
        if (totalMintCost === null) {
            setErrorMessage('Mint price not available yet. Please try again.');
            return;
        }
        if (lpTokenBalance !== null && lpTokenBalance < totalMintCost) {
            setErrorMessage('Insufficient LP token balance for the selected quantity.');
            return;
        }
        setLoading(true);
        setErrorMessage('');
        try {
            await executeContractWrite({
                publicClient,
                walletClient,
                account: userAddress,
                address: dsfoContractAddress,
                abi: DSFONFTABI,
                functionName: 'mintDSFONFT',
                args: [BigInt(mintQuantity)],
            });
            await refreshContractState();
        } catch (error) {
            console.error('Minting error:', error);
            setErrorMessage(error.message || 'An error occurred during minting.');
        } finally {
            setLoading(false);
        }
    };

    const mintButtonLabel = mintQuantity > 1 ? `Mint ${mintQuantity} DSFO NFTs` : 'Mint DSFO NFT';

    return (
        <MintContainer>
            <h3>Mint DSFO NFT</h3>
            <MintInfoContainer>
                <img src={dsfoNftImage} alt="DSFO Mint" />
                <MintDetails>
                    Mint Price: {mintPrice ? formatUnits(mintPrice, 18) : 'Loading...'} <img src={WPEAQLogo} width={18} alt="WPEAQ logo" /><img src={MRBLLogo} width={18} alt="MRBL logo" /> WPEAQ-MRBL LP Tokens
                </MintDetails>
                <MintDetails>
                    Mint Quantity:
                    <MintQuantityInput
                        type="number"
                        min={1}
                        value={mintQuantity}
                        onChange={handleQuantityChange}
                    />
                </MintDetails>
                <MintDetails>
                    Total Cost: {totalMintCost !== null
                        ? (
                            <>
                                {formatUnits(totalMintCost, 18)} <img src={WPEAQLogo} width={18} alt="WPEAQ logo" /><img src={MRBLLogo} width={18} alt="MRBL logo" /> WPEAQ-MRBL LP Tokens
                            </>
                        )
                        : 'Loading...'}
                </MintDetails>
                <MintDetails>
                    Your LP Token Balance: {lpTokenBalance !== null ? formatUnits(lpTokenBalance, 18) : 'Loading...'} LP Tokens
                </MintDetails>
                <MintDetails>
                    Your DSFO NFT Balance: {nftBalance !== null ? nftBalance.toString() : 'Loading...'} NFTs
                </MintDetails>
                <MintDetails>
                    Your Ownership Percentage of the DEX: {ownershipPercentage !== null ? ownershipPercentage + '%' : 'Loading...'}
                </MintDetails>
                <MintDetails>
                    Your Total WPEAQ DEX Fees earned: {totalWPEAQReceived !== null
                        ? (
                            <>
                                {parseFloat(formatUnits(totalWPEAQReceived, 18)).toFixed(6)} <img src={WPEAQLogo} width={18} alt="WPEAQ logo" /> WPEAQ
                            </>
                        )
                        : 'Loading...'}
                </MintDetails>
                <MintDetails>
                    Your Total MRBL DEX Fees earned: {totalMRBLReceived !== null
                        ? (
                            <>
                                {parseFloat(formatUnits(totalMRBLReceived, 18)).toFixed(6)} <img src={MRBLLogo} width={18} alt="MRBL logo" /> MRBL
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
                        mintPrice === null ||
                        lpTokenBalance === null ||
                        totalMintCost === null ||
                        !walletClient ||
                        lpTokenBalance < totalMintCost
                    }
                >
                    {loading ? <LoadingSpinner /> : mintButtonLabel}
                </MintButton>
            ) : (
                <MintButton onClick={handleApprove} disabled={loading || mintPrice === null || !walletClient || totalMintCost === null}>
                    {loading ? <LoadingSpinner /> : 'Approve'}
                </MintButton>
            )}
            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        </MintContainer>
    );
};

export default MintDSFONFT;
