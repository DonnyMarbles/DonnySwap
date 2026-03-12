import WPEAQLogo from './WPEAQ_logo.png';
import MRBLLogo from './MRBL_logo.png';
import PEAQLogo from './PEAQ_logo.png';

const tokenList = {
  '0xe488F2123f1bd88789817f09cd1989ec41Ae9baC': {
    symbol: 'MRBL',
    address: '0xe488F2123f1bd88789817f09cd1989ec41Ae9baC',
    decimals: 18,
    logo: MRBLLogo,
    name: 'Marbles',
  },
  PEAQ: {
    symbol: 'PEAQ',
    decimals: 18,
    address: 'PEAQ',
    logo: PEAQLogo,
    name: 'PEAQ',
  },
  '0x3cD66d2e1fac1751B0A20BeBF6cA4c9699Bb12d7': {
    symbol: 'WPEAQ',
    address: '0x3cD66d2e1fac1751B0A20BeBF6cA4c9699Bb12d7',
    decimals: 18,
    logo: WPEAQLogo,
    name: 'Wrapped PEAQ',
  }
};

export default tokenList;

