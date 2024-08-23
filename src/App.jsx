import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TokenContextProvider } from './contexts/TokenContext';
import { ABIContextProvider } from './contexts/ABIContext';
import Home from './components/Home';
import Swap from './components/Swap';
import NavBar from './components/NavBar';
import AddressConverter from './components/AddressConverter';
import AddLiquidity from './components/AddLiquidity';
import RemoveLiquidity from './components/RemoveLiquidity';
import Footer from './components/Footer';
import TokenPairs from './components/TokenPairs';
import TokenBalances from './components/TokenBalances';
import './App.css';
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TokenContextProvider>
      <ABIContextProvider>
        <div>
          <img src="src/assets/DonnySwapLogo.png" width="25%"/>
        </div>
        <Router>
          <NavBar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/add-liquidity" element={<AddLiquidity />} />
            <Route path="/remove-liquidity" element={<RemoveLiquidity />} />
            <Route path="/address-converter" element={<AddressConverter />} />
            <Route path="/token-pairs" element={<TokenPairs />} />
            <Route path="/token-balances" element={<TokenBalances />} />
          </Routes>
          <Footer />
        </Router>
      </ABIContextProvider>
    </TokenContextProvider>
  </QueryClientProvider>
);

export default App;
