import axios from 'axios';

import { PEAQ_RPC_HTTP } from '../config/constants.js';

let rpcRequestId = 0;

const callRpc = async (method, params = []) => {
  try {
    const response = await axios.post(
      PEAQ_RPC_HTTP,
      {
        jsonrpc: '2.0',
        id: ++rpcRequestId,
        method,
        params,
      },
      { timeout: 15000 }
    );
    if (response.data?.error) {
      throw new Error(response.data.error.message || 'RPC error');
    }
    return response.data?.result;
  } catch (error) {
    console.error(`RPC ${method} failed:`, error.message);
    throw error;
  }
};

const getUserBalance = async (address) => {
  const balanceHex = await callRpc('eth_getBalance', [address, 'latest']);
  if (typeof balanceHex !== 'string') {
    throw new Error('Invalid RPC response for user balance');
  }
  return BigInt(balanceHex);
};

export { callRpc, getUserBalance };

