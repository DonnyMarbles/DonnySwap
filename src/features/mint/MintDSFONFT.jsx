import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatUnits, getAddress } from 'viem';
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
import { DSFO_NFT_ADDRESS, MRBL_WPEAQ_PAIR_ADDRESS, LP_VAULT_ADDRESS } from '../../constants/contracts';
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
    const { DSFONFTv3ABI, ERC20ABI, LPVaultABI } = useABI();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [approved, setApproved] = useState(false);
    const [ownershipPercentage, setOwnershipPercentage] = useState(null);
    const [blockNumber, setBlockNumber] = useState(null);
    const [mintQuantity, setMintQuantity] = useState(1);
    const [lpTokenBalance, setLpTokenBalance] = useState(null);
    const [activeSupply, setActiveSupply] = useState(null);
    const [nftBalance, setNftBalance] = useState(null);
    const [allowance, setAllowance] = useState(null);
    const [currentPrice, setCurrentPrice] = useState(null);
    const [batchPrice, setBatchPrice] = useState(null);
    const [basePrice, setBasePrice] = useState(null);
    const [priceStep, setPriceStep] = useState(null);
    const [vaultHealth, setVaultHealth] = useState(null);

    // Block number polling
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

    const refreshContractState = useCallback(async () => {
        if (!publicClient) return;
        try {
            const dsfo = { address: dsfoContractAddress, abi: DSFONFTv3ABI };
            const lpToken = { address: mrblWPEAQPairAddress, abi: ERC20ABI };
            const vault = { address: getAddress(LP_VAULT_ADDRESS), abi: LPVaultABI };

            const results = await Promise.all([
                publicClient.readContract({ ...dsfo, functionName: 'currentMintPrice' }),
                publicClient.readContract({ ...dsfo, functionName: 'activeSupply' }),
                publicClient.readContract({ ...dsfo, functionName: 'basePrice' }),
                publicClient.readContract({ ...dsfo, functionName: 'priceStep' }),
                publicClient.readContract({ ...dsfo, functionName: 'batchMintPrice', args: [BigInt(mintQuantity)] }),
                userAddress
                    ? publicClient.readContract({ ...dsfo, functionName: 'balanceOf', args: [userAddress] })
                    : Promise.resolve(0n),
                userAddress
                    ? publicClient.readContract({ ...lpToken, functionName: 'balanceOf', args: [userAddress] })
                    : Promise.resolve(0n),
                userAddress
                    ? publicClient.readContract({ ...lpToken, functionName: 'allowance', args: [userAddress, dsfoContractAddress] })
                    : Promise.resolve(0n),
                publicClient.readContract({ ...vault, functionName: 'vaultHealthBps' }).catch(() => null),
            ]);

            setCurrentPrice(results[0]);
            setActiveSupply(results[1]);
            setBasePrice(results[2]);
            setPriceStep(results[3]);
            setBatchPrice(results[4]);
            setNftBalance(results[5]);
            setLpTokenBalance(results[6]);
            setAllowance(results[7]);
            setVaultHealth(results[8]);
        } catch (error) {
            console.error('Error refreshing DSFO contract state:', error);
        }
    }, [publicClient, userAddress, DSFONFTv3ABI, ERC20ABI, LPVaultABI, dsfoContractAddress, mrblWPEAQPairAddress, mintQuantity]);

    useEffect(() => {
        refreshContractState();
    }, [refreshContractState, blockNumber]);

    useEffect(() => {
        if (allowance !== null && batchPrice !== null) {
            setApproved(allowance >= batchPrice);
        } else {
            setApproved(false);
        }
    }, [allowance, batchPrice]);

    useEffect(() => {
        if (nftBalance !== null && activeSupply !== null && activeSupply > 0n) {
            const percentage = ((Number(nftBalance) / Number(activeSupply)) * 100).toFixed(2);
            setOwnershipPercentage(percentage);
        } else {
            setOwnershipPercentage(null);
        }
    }, [nftBalance, activeSupply]);

    const handleQuantityChange = (event) => {
        const value = Number(event.target.value);
        if (Number.isNaN(value) || value < 1) {
            setMintQuantity(1);
            return;
        }
        setMintQuantity(Math.min(Math.floor(value), 50));
    };

    const handleApprove = async () => {
        if (!walletClient || !publicClient || !userAddress) {
            setErrorMessage('Please connect your wallet to approve.');
            return;
        }
        if (batchPrice === null) {
            setErrorMessage('Mint price not available yet.');
            return;
        }
        setLoading(true);
        setErrorMessage('');
        try {
            await executeContractWrite({
                publicClient,
                walletClient,
                account: userAddress,
                address: mrblWPEAQPairAddress,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [dsfoContractAddress, batchPrice],
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
        if (batchPrice === null) {
            setErrorMessage('Mint price not available yet.');
            return;
        }
        if (lpTokenBalance !== null && lpTokenBalance < batchPrice) {
            setErrorMessage('Insufficient LP token balance.');
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
                abi: DSFONFTv3ABI,
                functionName: 'mint',
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
                    Current Mint Price: {currentPrice ? formatUnits(currentPrice, 18) : 'Loading...'} <img src={WPEAQLogo} width={18} alt="WPEAQ" /><img src={MRBLLogo} width={18} alt="MRBL" /> LP
                </MintDetails>
                {basePrice && priceStep && (
                    <MintDetails style={{ fontSize: '0.8em', color: '#555' }}>
                        Pricing: {formatUnits(basePrice, 18)} + ({activeSupply?.toString() || '0'} x {formatUnits(priceStep, 18)}) LP per NFT
                    </MintDetails>
                )}

                <MintDetails>
                    Mint Quantity:
                    <MintQuantityInput
                        type="number"
                        min={1}
                        max={50}
                        value={mintQuantity}
                        onChange={handleQuantityChange}
                    />
                </MintDetails>

                <MintDetails>
                    Total Cost: {batchPrice !== null
                        ? (<>{formatUnits(batchPrice, 18)} <img src={WPEAQLogo} width={18} alt="WPEAQ" /><img src={MRBLLogo} width={18} alt="MRBL" /> LP</>)
                        : 'Loading...'}
                </MintDetails>

                <MintDetails>
                    LP Split: 70% burned (permanent liquidity) / 30% to vault (redeemable)
                </MintDetails>

                <MintDetails>
                    Your LP Balance: {lpTokenBalance !== null ? formatUnits(lpTokenBalance, 18) : 'Loading...'} LP
                </MintDetails>

                <MintDetails>
                    Your DSFO NFTs: {nftBalance !== null ? nftBalance.toString() : 'Loading...'} | Active Supply: {activeSupply !== null ? activeSupply.toString() : '...'}
                </MintDetails>

                <MintDetails>
                    DEX Ownership: {ownershipPercentage !== null ? ownershipPercentage + '%' : 'Loading...'}
                </MintDetails>

                {vaultHealth !== null && (
                    <MintDetails>
                        Vault Health: {(Number(vaultHealth) / 100).toFixed(1)}%
                    </MintDetails>
                )}
            </MintInfoContainer>

            {approved ? (
                <MintButton
                    onClick={handleMint}
                    disabled={loading || batchPrice === null || lpTokenBalance === null || !walletClient || lpTokenBalance < batchPrice}
                >
                    {loading ? <LoadingSpinner /> : mintButtonLabel}
                </MintButton>
            ) : (
                <MintButton onClick={handleApprove} disabled={loading || batchPrice === null || !walletClient}>
                    {loading ? <LoadingSpinner /> : 'Approve LP'}
                </MintButton>
            )}
            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        </MintContainer>
    );
};

export default MintDSFONFT;
