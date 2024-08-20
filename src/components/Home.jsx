import React from 'react';
import { HomeContainer, TokenInfo } from '../styles/HomeStyles';
const Home = () => (
  <HomeContainer>
    <div>
    <h1>Welcome to DonnySwap v0.1.0</h1>
    <h1>Current features</h1>
    <ol>
      <li><h2>🔒Create LPs</h2></li>
      Create ERC-20 - ERC-20 LPs <br/>
      Create Native KRST - ERC-20 LPs <br/><br/>
      <li><h2>🔓Remove LPs</h2></li>
      Remove ERC-20 - ERC-20 LPs <br/>
      Remove Native KRST - ERC-20 LPs <br/><br/>
      <li><h2>🔁Swap Tokens</h2></li>
      Swap ERC-20 - ERC-20 LPs <br/>
      Swap Native KRST - ERC-20 LPs <br/>
      Wrap / Unwrap KRST - WKREST <br/>
      <li><h2>⛓Address Converter</h2></li>
      Convert H160 (EVM) Address to SS58 (Substrate) address
      for sending KRST from Substrate wallets to EVM wallets<br/>
      <li><h2>✅Strict Token List</h2></li>
      Current iteration only supports MRBL, KRST, WKREST <br/>
      To have your ERC-20 added, send an <a href="mailto:better.future.labs@gmail.com">email</a><br/>
      <li><h2>📖Open-sourced</h2></li>
      Wrapped KREST Contract: <a href="https://krest.subscan.io/account/0xDd11f4E48CE3A2B9043B2B0758ce704d3Fd191dc?tab=contract">Subscan</a> <br/>
      UniswapV2Router02 Contract: <a href="https://krest.subscan.io/account/0xf441807ed1943925f6f887660c44d7eb2ecc17c2?tab=contract">Subscan</a> <br/>
      SushiSwapFactory Contract: <a href="https://krest.subscan.io/account/0x23aAC8C182b2C2a2387868ee98C1544bF705c097?tab=contract">Subscan</a> <br/>
      Front-end Github Repo: <a href="https://github.com/DonnyMarbles/DonnySwap">Github</a><br/><br/>

      Recommended H160 (EVM) Wallet: 🦊 <a href="https://metamask.io/">Metamask</a> <br/>
      Recommended SS58 (Substrate) Wallet: <a href="https://talisman.xyz/">Talisman</a><br/><br/>
    </ol>
  </div>
    </HomeContainer>
);

export default Home;