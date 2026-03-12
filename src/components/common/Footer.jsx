import { useTokens } from '../../contexts/TokenContext';
import { usePEAQPrice } from '../../contexts/PEAQPriceContext';
import WPEAQLogo from '../../assets/WPEAQ_logo.png';
import ConnectionStatus, {
  FooterContainer,
  LogoContainer,
  PriceContainer,
  BlockNumber,
} from '../../styles/FooterStyles';
import { useWallet } from '../../contexts/WalletContext';
import useBlockNumberPolling from '../../hooks/useBlockNumberPolling';

const Footer = () => {
  const { publicClient, isConnected } = useWallet();
  const { PEAQPrice, loading, error } = usePEAQPrice();
  const blockNumber = useBlockNumberPolling(publicClient);

  return (
    <FooterContainer>
      <LogoContainer>
        <ConnectionStatus isConnected={isConnected} />
        <img src={WPEAQLogo} alt="WPEAQ Logo" width="20" />
      </LogoContainer>
      <PriceContainer>
        1 <img src={WPEAQLogo} alt="WPEAQ Logo" width="15" /> PEAQ : ${loading ? 'Loading...' : error ? 'N/A' : (PEAQPrice ? PEAQPrice.toFixed(6) : '0.000000')} USD
      </PriceContainer>

      <BlockNumber>Block: {blockNumber}</BlockNumber>
    </FooterContainer>
  );
};

export default Footer;
