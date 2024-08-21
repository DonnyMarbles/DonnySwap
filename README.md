Welcome to DonnySwap v0.1.21

https://donnyswap.betterfuturelabs.xyz/

**FIREFOX USERS**


If using multiple Web3 Wallets such as Phantom and Metamask, disable one, or update
'Default Wallet App' setting in Phantom from 'Always Ask' to 'Metamask'
    
    ***Current features***

    🔁Swap Tokens
        Swap ERC-20 - ERC-20 LPs
        Swap Native KRST - ERC-20 LPs
        Wrap / Unwrap KRST - WKREST

    💧Liquidity
        Add Liquidity: Create ERC-20 - ERC-20 LPs
        Create Native KRST - ERC-20 LPs

        Remove Liquidity: Remove ERC-20 - ERC-20 LPs
        Remove Native KRST - ERC-20 LPs

    💰Balances
        LP Token Pairs: Dynamically loads every DonnySwap LP Token pair and displays relevant information

        Token Balances: Dynamically loads all Strict tokens & displays relevant information

    ⛓Address Converter
        Convert H160 (EVM) Address to SS58 (Substrate) address for sending KRST from Substrate wallets to EVM wallets
    ✅Strict Token List
        Current iteration only supports MRBL, KRST, WKREST
        To have your ERC-20 added, send an email to better.future.labs@gmail.com
        and submit a PR to update src/assets/tokenList.json structured as follows:

            "0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc": {
                "symbol": "WKREST",
                "address": "0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc",
                decimals": 18,
                "logo": "src/assets/WKREST_logo.png" // Please use IPFS link instead
            },
            
    📖Open-source Contracts
    Tokens:
    Marbles (MRBL) Contract: [Subscan](https://krest.subscan.io/account/0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc)
    Wrapped KREST (WKREST) Contract: [Subscan](https://krest.subscan.io/account/0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc?tab=contract)
    Backend Contracts:
    UniswapV2Router02 Contract: [Subscan](https://krest.subscan.io/account/0xf441807ed1943925f6f887660c44d7eb2ecc17c2?tab=contract)
    SushiSwapFactory Contract: [Subscan](https://krest.subscan.io/account/0x23aAC8C182b2C2a2387868ee98C1544bF705c097?tab=contract)
    Front-end Github Repo: [Github](https://github.com/DonnyMarbles/DonnySwap)

    Recommended H160 (EVM) Wallet: 🦊 Metamask
    Recommended SS58 (Substrate) Wallet: Talisman

    KREST USD Price via CoinPaprika API (Thank you CoinPaprika!!!)


