import { Router } from 'express';

import { pool } from '../db/pool.js';
import { CHAIN_PEAQ } from '../config/constants.js';
import {
  normalizeOptionalAddress,
  normalizeDecimals,
  decimalToRawString,
  toBufferFromHex,
  parseInteger,
  ensureNonNegativeInteger,
} from '../utils/data.js';
import { USER_FEES_COLUMNS, ensureErc20TokenRecord } from '../services/feesService.js';

const router = Router();

router.post('/insertFeesPEAQ', async (req, res) => {
  const {
    user_address,
    token_symbol,
    token_address = null,
    token_decimals,
    fee_amount,
    fee_amount_raw,
    fee_amount_decimals,
    block_height,
    fee_manager_tx,
    nft_count,
    nft_count_snapshot,
  } = req.body || {};
  if (!user_address || !token_symbol) {
    return res.status(400).json({ error: 'user_address and token_symbol are required' });
  }

  let blockHeightValue;
  try {
    blockHeightValue = ensureNonNegativeInteger(block_height, 'block_height');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const normalizedTokenAddress = normalizeOptionalAddress(token_address);
  const tokenDecimalsValue = normalizeDecimals(
    token_decimals !== undefined && token_decimals !== null ? token_decimals : fee_amount_decimals
  );
  const decimalsValue =
    fee_amount_decimals !== undefined && fee_amount_decimals !== null
      ? normalizeDecimals(fee_amount_decimals)
      : tokenDecimalsValue;
  let rawAmountValue;
  try {
    rawAmountValue =
      fee_amount_raw !== undefined && fee_amount_raw !== null && fee_amount_raw !== ''
        ? fee_amount_raw.toString()
        : decimalToRawString(fee_amount, decimalsValue);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid fee_amount' });
  }

  if (rawAmountValue === null) {
    return res.status(400).json({ error: 'fee_amount_raw or fee_amount must be provided' });
  }

  let txBuffer;
  try {
    txBuffer = toBufferFromHex(fee_manager_tx, 'fee_manager_tx');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const nftSnapshot = parseInteger(nft_count_snapshot) ?? parseInteger(nft_count) ?? 0;

  try {
    if (normalizedTokenAddress) {
      await ensureErc20TokenRecord({
        tokenAddress: normalizedTokenAddress,
        tokenSymbol: token_symbol,
        tokenDecimals: tokenDecimalsValue,
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO user_fees
        (chain, user_address, token_symbol, token_address, fee_amount_raw, fee_amount_decimals, block_height, fee_manager_tx, nft_count_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        CHAIN_PEAQ,
        user_address,
        token_symbol,
        normalizedTokenAddress,
        rawAmountValue,
        decimalsValue,
        blockHeightValue,
        txBuffer,
        nftSnapshot,
      ]
    );

    const { rows } = await pool.query(
      `SELECT ${USER_FEES_COLUMNS}
         FROM user_fees
        WHERE chain = $1 AND id = $2`,
      [CHAIN_PEAQ, insertResult.rows[0].id]
    );
    res.status(200).json({ success: true, fee: rows[0] });
  } catch (err) {
    console.error('Error in insertFees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/updateBlockHeightPEAQ', async (req, res) => {
  const { block_height } = req.body || {};
  let blockHeightValue;
  try {
    blockHeightValue = ensureNonNegativeInteger(block_height, 'block_height');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const result = await pool.query(
      `INSERT INTO block_listener_progress (chain, last_height, last_seen_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (chain)
       DO UPDATE SET last_height = EXCLUDED.last_height, last_seen_at = EXCLUDED.last_seen_at
       RETURNING last_height, last_seen_at`,
      [CHAIN_PEAQ, blockHeightValue]
    );
    res.status(200).json({ success: true, progress: result.rows[0] });
  } catch (err) {
    console.error('Error in updateBlockHeight:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getFeesPEAQ/:user_address', async (req, res) => {
  const { user_address } = req.params;

  try {
    const result = await pool.query(
      `SELECT ${USER_FEES_COLUMNS}
         FROM user_fees
        WHERE chain = $1 AND user_address = $2
        ORDER BY recorded_at DESC`,
      [CHAIN_PEAQ, user_address]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getFees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getAllFeesPEAQ', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${USER_FEES_COLUMNS}
         FROM user_fees
        WHERE chain = $1
        ORDER BY recorded_at DESC`,
      [CHAIN_PEAQ]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getAllFees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getAggregatedFeesPEAQ', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT token_symbol,
              SUM(fee_amount_raw::numeric / POWER(10::numeric, fee_amount_decimals)) AS total_amount
         FROM user_fees
        WHERE chain = $1
        GROUP BY token_symbol
        ORDER BY total_amount DESC`,
      [CHAIN_PEAQ]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getAggregatedFees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getAggregatedFeesPEAQ/:user_address', async (req, res) => {
  const { user_address } = req.params;

  try {
    const result = await pool.query(
      `SELECT token_symbol,
              SUM(fee_amount_raw::numeric / POWER(10::numeric, fee_amount_decimals)) AS total_amount
         FROM user_fees
        WHERE chain = $1 AND user_address = $2
        GROUP BY token_symbol
        ORDER BY total_amount DESC`,
      [CHAIN_PEAQ, user_address]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getAggregatedUserFees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getLastBlockHeightPEAQ', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT last_height FROM block_listener_progress WHERE chain = $1 LIMIT 1',
      [CHAIN_PEAQ]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'No block height found' });
    } else {
      res.status(200).json({ block_height: result.rows[0].last_height });
    }
  } catch (err) {
    console.error('Error in getLastBlockHeight:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

