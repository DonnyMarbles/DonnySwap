import { getAddress } from 'viem';

import {
  FACTORY_ADDRESS as FACTORY_ADDRESS_RAW,
  WRAPPED_PEAQ_ADDRESS,
} from '../../constants/contracts';
import { ZERO_ADDRESS } from '../../lib/viemHelpers';

export const FACTORY_ADDRESS = getAddress(FACTORY_ADDRESS_RAW);
export const WRAPPED_PEAQ = getAddress(WRAPPED_PEAQ_ADDRESS);
export const NULL_ADDRESS = ZERO_ADDRESS;
export const TOKEN_BALANCES_CHAIN_ID = 3338;
export const EMPTY_PEAQ_METRICS = {
  totalSupply: '0.000000',
  circulatingSupply: '0.000000',
  userBalance: '0.000000',
  totalBurnedTokens: '0.000000',
  burnedPercentage: '0.00',
  userShare: '0.00',
  marketCap: '0.00',
  userBalanceUSD: '0.00',
};

