import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TokenContextProvider } from '../contexts/TokenContext';
import { ABIContextProvider } from '../contexts/ABIContext';
import { PEAQPriceProvider } from '../contexts/PEAQPriceContext';
import { TokenPairsProvider } from '../contexts/TokenPairsContext';
import NavBar from '../components/common/NavBar';
import Footer from '../components/common/Footer';
import AlertProvider from '../components/common/AlertProvider';
import AppShell from '../components/common/AppShell';
import ErrorBoundary from '../components/common/ErrorBoundary';
import './App.css';
import DonnySwapLogo from '../assets/DonnySwapLogo.png';
import LandingPageBackground from '../assets/landing_page_bg.png';
import SwapBackground from '../assets/Swap_bg.png';
import AddLiquidityBackground from '../assets/Add_liquidity_bg.png';
import RemoveLiquidityBackground from '../assets/Remove_liquidity_bg.png';
import AddressConverterBackground from '../assets/Address_conversion_bg.png';
import TokenPairsBackground from '../assets/Token_pairs_bg.png';
import TokenBalancesBackground from '../assets/Token_balances_bg.png';
import MintBackground from '../assets/mint_DSFO_NFTs_bg.png';
import FeeDashboardBackground from '../assets/fee_dashboard_bg.png';

// Lazy load components
const Home = lazy(() => import('../features/home/Home'));
const Swap = lazy(() => import('../features/swap/Swap'));
const AddressConverter = lazy(() => import('../features/addressing/AddressConverter'));
const AddLiquidity = lazy(() => import('../features/liquidity/AddLiquidity'));
const RemoveLiquidity = lazy(() => import('../features/liquidity/RemoveLiquidity'));
const TokenPairs = lazy(() => import('../features/token-pairs/TokenPairs'));
const TokenBalances = lazy(() => import('../features/token-balances/TokenBalances'));
const MintDSFONFT = lazy(() => import('../features/mint/MintDSFONFT'));
const FeesDashboard = lazy(() => import('../features/fees/FeesDashboard'));

const queryClient = new QueryClient();

const routeBackgrounds = {
  '/': LandingPageBackground,
  '/swap': SwapBackground,
  '/add-liquidity': AddLiquidityBackground,
  '/remove-liquidity': RemoveLiquidityBackground,
  '/address-converter': AddressConverterBackground,
  '/token-pairs': TokenPairsBackground,
  '/token-balances': TokenBalancesBackground,
  '/mint-dsfo-nfts': MintBackground,
  '/fee-dashboard': FeeDashboardBackground,
};

const AppLayout = () => {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const pathKey = normalizedPath.toLowerCase();
  const backgroundImage = routeBackgrounds[pathKey] || LandingPageBackground;

  return (
    <AppShell backgroundImage={backgroundImage}>
      <div className="app-logo">
        <img src={DonnySwapLogo} width="25%" alt="DonnySwap Logo" />
      </div>
      <NavBar />
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/add-liquidity" element={<AddLiquidity />} />
            <Route path="/remove-liquidity" element={<RemoveLiquidity />} />
            <Route path="/address-converter" element={<AddressConverter />} />
            <Route path="/token-pairs" element={<TokenPairs />} />
            <Route path="/token-balances" element={<TokenBalances />} />
            <Route path="/mint-DSFO-NFTs" element={<MintDSFONFT />} />
            <Route path="/fee-dashboard" element={<FeesDashboard />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Footer />
    </AppShell>
  );
};

const App = () => {
  
  // Preload important components on initial load
  useEffect(() => {
    // Preload components that are likely to be visited
    import('../features/fees/FeesDashboard');
    import('../features/mint/MintDSFONFT');
    import('../features/token-pairs/TokenPairs');
    import('../features/token-balances/TokenBalances');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AlertProvider>
        <TokenContextProvider>
          <ABIContextProvider>
            <PEAQPriceProvider>
              <TokenPairsProvider>
                <Router>
                  <AppLayout />
                </Router>
              </TokenPairsProvider>
            </PEAQPriceProvider>
          </ABIContextProvider>
        </TokenContextProvider>
      </AlertProvider>
    </QueryClientProvider>
  );
};

export default App;
