import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3ContextProvider } from './contexts/Web3Context';
import { TokenContextProvider } from './contexts/TokenContext';
import { ABIContextProvider } from './contexts/ABIContext';
import Home from './components/Home';
import Swap from './components/Swap';
import NavBar from './components/NavBar';
import AddressConverter from './components/AddressConverter'
import AddLiquidity from './components/AddLiquidity';
import './App.css';
import RemoveLiquidity from './components/RemoveLiquidity';
import Footer from './components/Footer';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3ContextProvider>
      <TokenContextProvider>
        <ABIContextProvider>
          <div>
            <h1>👑DonnySwap</h1>
            <h2>Open-Source Permissionlessly Provided Infrastructure</h2>
          </div>
          <Router>
            <NavBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/swap" element={<Swap />} />
              <Route path="/add-liquidity" element={<AddLiquidity />} />
              <Route path="/remove-liquidity" element={<RemoveLiquidity />} />
              <Route path="/address-converter" element={<AddressConverter />} />
            </Routes>
            <Footer />
          </Router>
        </ABIContextProvider>
      </TokenContextProvider>
    </Web3ContextProvider>
  </QueryClientProvider>
);

export default App;
