import { pool } from '../db/pool.js';
import { CHAIN_PEAQ } from '../config/constants.js';
import { normalizeDecimals } from '../utils/data.js';

const USER_FEES_COLUMNS = `
    id,
    chain,
    user_address,
    token_symbol,
    token_address,
    block_height,
    recorded_at AS timestamp,
    nft_count_snapshot AS nft_count,
    fee_amount_raw,
    fee_amount_decimals,
    fee_manager_tx,
    (fee_amount_raw::numeric / POWER(10::numeric, fee_amount_decimals)) AS fees_amount
  `;

const ensureErc20TokenRecord = async ({ tokenAddress, tokenSymbol, tokenDecimals }) => {
  if (!tokenAddress) {
    return;
  }
  const symbolValue = tokenSymbol && String(tokenSymbol).trim().length ? tokenSymbol : 'UNKNOWN';
  const decimalsValue = normalizeDecimals(tokenDecimals);
  await pool.query(
    `INSERT INTO erc20_tokens (chain, address, symbol, decimals)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (chain, address)
     DO UPDATE SET symbol = EXCLUDED.symbol, decimals = EXCLUDED.decimals`,
    [CHAIN_PEAQ, tokenAddress, symbolValue, decimalsValue]
  );
};

export { USER_FEES_COLUMNS, ensureErc20TokenRecord };

