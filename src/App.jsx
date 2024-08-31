import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TokenContextProvider } from './contexts/TokenContext';
import { ABIContextProvider } from './contexts/ABIContext';
import { KRESTPriceProvider } from './contexts/KRESTPriceContext';
import { TokenPairsProvider } from './contexts/TokenPairsContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import './App.css';

// Lazy load components
const Home = React.lazy(() => import('./components/Home'));
const Swap = React.lazy(() => import('./components/Swap'));
const AddressConverter = React.lazy(() => import('./components/AddressConverter'));
const AddLiquidity = React.lazy(() => import('./components/AddLiquidity'));
const RemoveLiquidity = React.lazy(() => import('./components/RemoveLiquidity'));
const TokenPairs = React.lazy(() => import('./components/TokenPairs'));
const TokenBalances = React.lazy(() => import('./components/TokenBalances'));
const MintDSFONFT = React.lazy(() => import('./components/MintDSFONFT'));
const FeesDashboard = React.lazy(() => import('./components/FeesDashboard'));

const queryClient = new QueryClient();

const App = () => {
  
  // Preload important components on initial load
  useEffect(() => {
    // Preload components that are likely to be visited
    import('./components/FeesDashboard');
    import('./components/MintDSFONFT');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TokenContextProvider>
        <ABIContextProvider>
          <KRESTPriceProvider>
            <TokenPairsProvider> {/* Added TokenPairsProvider */}
              <div>
                <img src="src/assets/DonnySwapLogo.png" width="25%" alt="DonnySwap Logo" />
              </div>
              <Router>
                <NavBar />
                <React.Suspense fallback={<div>Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/swap" element={<Swap />} />
                    <Route path="/add-liquidity" element={<AddLiquidity />} />
                    <Route path="/remove-liquidity" element={<RemoveLiquidity />} />
                    <Route path="/address-converter" element={<AddressConverter />} />
                    <Route path="/token-pairs" element={<TokenPairs />} />
                    <Route path="/token-balances" element={<TokenBalances />} />
                    <Route path="/mint-DFSO-NFTs" element={<MintDSFONFT />} />
                    <Route path='/fee-dashboard' element={<FeesDashboard />} />
                  </Routes>
                </React.Suspense>
                <Footer />
              </Router>
            </TokenPairsProvider>
          </KRESTPriceProvider>
        </ABIContextProvider>
      </TokenContextProvider>
    </QueryClientProvider>
  );
};

export default App;
