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
  console.log('Insert Fees Request:', {
    user_address,
    token_symbol,
    token_address,
    fee_amount,
    fee_amount_raw,
    fee_amount_decimals,
    block_height,
    nft_count,
    nft_count_snapshot,
  });

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
  console.log('Update Block Height Request:', { block_height });

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
    console.log('Update Block Height Result:', result.rows[0]);
    res.status(200).json({ success: true, progress: result.rows[0] });
  } catch (err) {
    console.error('Error in updateBlockHeight:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getFeesPEAQ/:user_address', async (req, res) => {
  const { user_address } = req.params;
  console.log('Fetching fees for user:', user_address);

  try {
    const result = await pool.query(
      `SELECT ${USER_FEES_COLUMNS}
         FROM user_fees
        WHERE chain = $1 AND user_address = $2
        ORDER BY recorded_at DESC`,
      [CHAIN_PEAQ, user_address]
    );
    console.log('Query result:', result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getFees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getAllFeesPEAQ', async (req, res) => {
  console.log('Fetching all fees data');

  try {
    const result = await pool.query(
      `SELECT ${USER_FEES_COLUMNS}
         FROM user_fees
        WHERE chain = $1
        ORDER BY recorded_at DESC`,
      [CHAIN_PEAQ]
    );
    console.log('All fees query result:', result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getAllFees:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/getLastBlockHeightPEAQ', async (req, res) => {
  console.log('Fetching the last block height');

  try {
    const result = await pool.query(
      'SELECT last_height FROM block_listener_progress WHERE chain = $1 LIMIT 1',
      [CHAIN_PEAQ]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'No block height found' });
    } else {
      console.log('Last block height query result:', result.rows[0]);
      res.status(200).json({ block_height: result.rows[0].last_height });
    }
  } catch (err) {
    console.error('Error in getLastBlockHeight:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

