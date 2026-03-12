import {
  HomeContainer,
  TokenInfo,
  FeatureList,
  FeatureItem,
  TokenImage,
  SectionHeader,
  SubSectionHeader,
  ContractLink,
  ExternalLink,
  Note,
} from '../../styles/HomeStyles';
import MRBLLogo from '../../assets/MRBL_logo.png';
import WPEAQLogo from '../../assets/WPEAQ_logo.png';
import { FACTORY_ADDRESS, WRAPPED_PEAQ_ADDRESS } from '../../constants/contracts';

const Home = () => {
  return (
    <HomeContainer>
      <FeatureList>
      <SectionHeader>Welcome to DonnySwap!<br />v2.0.0</SectionHeader>
      <ExternalLink href="https://x.com/Donny_Marbles" target="_blank">
        <TokenImage src={MRBLLogo} alt="Token Logo" width="60" />
      </ExternalLink>
      <SectionHeader>Current features</SectionHeader>

      
        <FeatureItem>
          <SubSectionHeader>🔁 Swap Tokens</SubSectionHeader>
          <p><b>Swap</b>: Native PEAQ (PEAQ) or ERC-20s</p>
          <p><b>Wrap</b>: PEAQ to WPEAQ</p>
          <p><b>Unwrap</b>: WPEAQ to PEAQ</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>💧 Liquidity</SubSectionHeader>
          <p><b>Add Liquidity</b>: Create ERC-20 - ERC-20 LPs<br />Create Native PEAQ - ERC-20 LPs</p>
          <p><b>Remove Liquidity</b>: Remove ERC-20 - ERC-20 LPs<br />Remove Native PEAQ - ERC-20 LPs</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>💎 Balances</SubSectionHeader>
          <p><b>LP Token Pairs</b>: Dynamically loads every DonnySwap LP Token pair <br/> & displays relevant information</p>
          <p><b>Token Balances</b>: Dynamically loads all Strict tokens <br/> & displays relevant information</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>⛓ Address Converter</SubSectionHeader>
          <p>Convert H160 (EVM) Address to SS58 (Substrate) address<br/> for sending PEAQ from Substrate wallets to EVM wallets</p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>🆕 DSFO NFTs</SubSectionHeader>
          <p>Become a part owner of DonnySwap!<br/> By minting a DSFO NFT you receive a 
          proportional portion<br/> of every trade made on the DEX</p> *Distributed every 4 hours* <br/> Subject to change by governance vote in future
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>✅ Strict Token List</SubSectionHeader>
          <p>Current iteration only supports MRBL, PEAQ & <ContractLink href="https://tokenlist.peaq.xyz" target="_blank">tokenlist.peaq.xyz</ContractLink><br />To have your ERC-20 added, send an <ExternalLink href="mailto:better.future.labs@gmail.com" target="_blank">email</ExternalLink></p>
          Tokens listed subject to change by governance vote in future
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>📖 Open-source Contracts</SubSectionHeader>
          <SubSectionHeader>Tokens:</SubSectionHeader>
          <TokenInfo>
            <TokenImage src={MRBLLogo} alt="MRBL Logo" width="20" />Marbles (MRBL) Contract: <ContractLink href="https://peaq.subscan.io/account/0xe488F2123f1bd88789817f09cd1989ec41Ae9baC?tab=contract" target="_blank">Subscan</ContractLink>
          </TokenInfo>
          <TokenInfo>
            <TokenImage src={WPEAQLogo} alt="WPEAQ Logo" width="20" /> DonnySwap Wrapped PEAQ (WPEAQ) Contract: <ContractLink href={`https://peaq.subscan.io/token/${WRAPPED_PEAQ_ADDRESS}`} target="_blank">Subscan</ContractLink>
          </TokenInfo>
          <SubSectionHeader>Backend Contracts:</SubSectionHeader>
          <p>🦄 UniswapV2Router02 Contract: <ContractLink href="https://repo.sourcify.dev/3338/0xBa6777062F71318de6b681370189055904e20D21" target="_blank">Sourcify</ContractLink></p>
          <p>🍣 SushiSwapFactory Contract: <ContractLink href="https://repo.sourcify.dev/3338/0x60659f5997C8D58DC4E4dcC1bdB89E8f62Be40E6" target="_blank">Sourcify</ContractLink></p>
          <p>🎯 FeeManager Contract: <ContractLink href="https://repo.sourcify.dev/3338/0x9cE36CdD9B164a686F4B9AE728f5f68b7b41acaa/" target="_blank">Sourcify</ContractLink></p>
          <p>👑 DSFO NFT Contract: <ContractLink href="https://repo.sourcify.dev/3338/0x9810eD5D5d8b3646575974296eC697d4CBbF56cF/" target="_blank">Sourcify</ContractLink></p>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>🌎 Front-end Github Repo</SubSectionHeader>
          <ExternalLink href="https://github.com/DonnyMarbles/DonnySwap" target="_blank">Github</ExternalLink>
        </FeatureItem>

        <FeatureItem>
          <SubSectionHeader>🦊 Suggested H160 (EVM) Wallet</SubSectionHeader>
          <ExternalLink href="https://metamask.io/" target="_blank">Metamask</ExternalLink>
          <SubSectionHeader>☯️ Suggested SS58 (Substrate) Wallet</SubSectionHeader>
          <ExternalLink href="https://talisman.xyz/" target="_blank">Talisman</ExternalLink>
        </FeatureItem>

        <Note>⚠️ If using multiple Web3 Wallets such as Phantom and Metamask, disable one,<br/> or update &lsquo;Default Wallet App&rsquo; setting in Phantom from &lsquo;Always Ask&rsquo; to &lsquo;Metamask&rsquo;</Note>

        <FeatureItem>
          <TokenImage src={WPEAQLogo} alt="WPEAQ Logo" width="20" /><ContractLink href="https://www.coingecko.com/en/coins/peaq" target="_blank">PEAQ</ContractLink> USD Price via AcelonSDK<br />(Thank you <ExternalLink href="https://github.com/acelonoracle/acelon-sdk" target="_blank">Acurast / Acelon Team!</ExternalLink>!!!)
        </FeatureItem>
      </FeatureList>
    </HomeContainer>
  );
};

export default Home;
