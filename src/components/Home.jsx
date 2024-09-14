import React, { useEffect } from 'react';
import { HomeContainer, TokenInfo, FeatureList, FeatureItem, TokenImage, SectionHeader, SubSectionHeader, ContractLink, ExternalLink, Note } from '../styles/HomeStyles';
import MRBLLogo from '../assets/MRBL_logo.png';
import WKRESTLogo from '../assets/WKREST_logo.png';

const Home = () => {
  useEffect(() => {
    document.body.style.backgroundImage = 'url("/src/assets/landing_page.jpg")';
    document.body.style.backgroundSize = '100% 100%';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    return () => {
        document.body.style.backgroundImage = 'url("/src/assets/landing_page.jpg")';
    };
  }, []);
  
  
  return (
    <HomeContainer>
      <SectionHeader>Welcome to DonnySwap!<br />v0.1.6.1</SectionHeader>
      <ExternalLink href="https://x.com/Donny_Marbles">
        <TokenImage src={MRBLLogo} alt="Token Logo" width="60" />
      </ExternalLink>
      <SectionHeader>Current features</SectionHeader>

      <FeatureList>
        <FeatureItem>
          <SubSectionHeader>🔁 Swap Tokens</SubSectionHeader>
          <p><b>Swap</b>: Native KREST (KRST) or ERC-20s</p>
          <p><b>Wrap</b>: KRST to WKREST</p>
          <p><b>Unwrap</b>: WKREST to KRST</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>💧 Liquidity</SubSectionHeader>
          <p><b>Add Liquidity</b>: Create ERC-20 - ERC-20 LPs<br />Create Native KRST - ERC-20 LPs</p>
          <p><b>Remove Liquidity</b>: Remove ERC-20 - ERC-20 LPs<br />Remove Native KRST - ERC-20 LPs</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>💎 Balances</SubSectionHeader>
          <p><b>LP Token Pairs</b>: Dynamically loads every DonnySwap LP Token pair <br/> & displays relevant information</p>
          <p><b>Token Balances</b>: Dynamically loads all Strict tokens <br/> & displays relevant information</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>⛓ Address Converter</SubSectionHeader>
          <p>Convert H160 (EVM) Address to SS58 (Substrate) address<br/> for sending KRST from Substrate wallets to EVM wallets</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>🆕 DSFO NFTs</SubSectionHeader>
          <p>Become a part owner of DonnySwap!<br/> By minting a DSFO NFT you receive a 
          proportional portion<br/> of every trade made on the DEX</p> *Distributed every 4 hours* <br/> Subject to change by governance vote in future
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>✅ Strict Token List</SubSectionHeader>
          <p>Current iteration only supports MRBL, KRST, WKREST<br />To have your ERC-20 added, send an <ExternalLink href="mailto:better.future.labs@gmail.com">email</ExternalLink></p>
          Tokens listed subject to change by governance vote in future
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>📖 Open-source Contracts</SubSectionHeader>
          <SubSectionHeader>Tokens:</SubSectionHeader>
          <TokenInfo>
            <TokenImage src={MRBLLogo} alt="MRBL Logo" width="20" />Marbles (MRBL) Contract: <ContractLink href="https://krest.subscan.io/account/0xf5321b84aae2990FEC72FD57aF1B4a99B01EB928?tab=contract">Subscan</ContractLink>
          </TokenInfo>
          <TokenInfo>
            <TokenImage src={WKRESTLogo} alt="WKREST Logo" width="20" />Wrapped KREST (WKREST) Contract: <ContractLink href="https://krest.subscan.io/account/0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc?tab=contract">Subscan</ContractLink>
          </TokenInfo>
          <SubSectionHeader>Backend Contracts:</SubSectionHeader>
          <p>🦄 UniswapV2Router02 Contract: <ContractLink href="https://krest.subscan.io/account/0xf441807ed1943925f6f887660c44d7eb2ecc17c2?tab=contract">Subscan</ContractLink></p>
          <p>🍣 SushiSwapFactory Contract: <ContractLink href="https://krest.subscan.io/account/0x23aAC8C182b2C2a2387868ee98C1544bF705c097?tab=contract">Subscan</ContractLink></p>
          <p>🎯 FeeManager Contract: <ContractLink href="https://krest.subscan.io/account/0xdc8af65d6cdc2f6da11873be244100c0e82f64b3?tab=contract">Subscan</ContractLink></p>
          <p>👑 DSFO NFT Contract: <ContractLink href="https://krest.subscan.io/account/0x83aa476fe09a925711cac050dc8320b4256b398c?tab=contract">Subscan</ContractLink></p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>🌎 Front-end Github Repo</SubSectionHeader>
          <ExternalLink href="https://github.com/DonnyMarbles/DonnySwap">Github</ExternalLink>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>🦊 Suggested H160 (EVM) Wallet</SubSectionHeader>
          <ExternalLink href="https://metamask.io/">Metamask</ExternalLink>
          <SubSectionHeader>☯️ Suggested SS58 (Substrate) Wallet</SubSectionHeader>
          <ExternalLink href="https://talisman.xyz/">Talisman</ExternalLink>
        </FeatureItem>

        <Note>⚠️ If using multiple Web3 Wallets such as Phantom and Metamask, disable one,<br/> or update 'Default Wallet App' setting in Phantom from 'Always Ask' to 'Metamask'</Note>

        <TokenInfo>
          <TokenImage src={WKRESTLogo} alt="WKREST Logo" width="20" /><ContractLink href="https://krest.subscan.io/account/0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc?tab=contract">WKREST</ContractLink> USD Price via CoinPaprika API<br />(Thank you <ExternalLink href="https://coinpaprika.com/">CoinPaprika</ExternalLink>!!!)
        </TokenInfo>
      </FeatureList>
    </HomeContainer>
  );
};

export default Home;
