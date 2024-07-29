import Web3 from 'web3';

let web3;

if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    window.ethereum.request({ method: 'eth_requestAccounts' }).catch(error => {
        console.log("User denied account access");
    });
} else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
} else {
    const provider = new Web3.providers.HttpProvider('https://krest.betterfuturelabs.xyz');
    web3 = new Web3(provider);
}

const connectWallet = async () => {
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            await switchNetwork();
        } catch (error) {
            console.error("User denied account access or error occurred", error);
        }
    } else {
        console.error("No Ethereum provider found. Please install MetaMask.");
    }
};

const switchNetwork = async () => {
    const chainId = '0x8C1'; // Hexadecimal value for 2241
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId,
                            chainName: 'KREST EVM',
                            nativeCurrency: {
                                name: 'KREST',
                                symbol: 'KREST',
                                decimals: 18,
                            },
                            rpcUrls: ['https://krest.betterfuturelabs.xyz'],
                            blockExplorerUrls: ['https://krest.subscan.io'],
                        },
                    ],
                });
            } catch (addError) {
                console.error('Error adding network', addError);
            }
        }
    }
};

export { connectWallet, switchNetwork };
export default web3;
