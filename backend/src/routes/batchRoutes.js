import { Router } from 'express';

import { pool } from '../db/pool.js';
import { CHAIN_PEAQ } from '../config/constants.js';
import {
  normalizeOptionalAddress,
  toBufferFromHex,
  ensureNonNegativeInteger,
} from '../utils/data.js';

const router = Router();

/**
 * POST /fee-batch
 *
 * Records a fee distribution batch and its per-holder allocations in a single
 * transaction. Also upserts holder balances into dsfo_holder_balances (required
 * by the FK on fee_allocations).
 *
 * Body:
 *   fee_manager_tx   - hex tx hash
 *   lp_token         - LP token address
 *   token_paid        - underlying token address
 *   token_paid_symbol - symbol (for convenience)
 *   token_paid_decimals - decimals
 *   amount_paid_raw   - raw total amount string
 *   block_height      - block number
 *   allocations[]     - array of { holder_address, amount_raw, nft_count }
 */
router.post('/fee-batch', async (req, res) => {
  const {
    fee_manager_tx,
    lp_token,
    token_paid,
    token_paid_symbol,
    amount_paid_raw,
    block_height,
    allocations = [],
  } = req.body || {};

  if (!token_paid || !amount_paid_raw) {
    return res.status(400).json({ error: 'token_paid and amount_paid_raw are required' });
  }

  let blockHeightValue;
  try {
    blockHeightValue = ensureNonNegativeInteger(block_height, 'block_height');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let txBuffer;
  try {
    txBuffer = toBufferFromHex(fee_manager_tx, 'fee_manager_tx');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const lpTokenAddr = normalizeOptionalAddress(lp_token) || '0x0000000000000000000000000000000000000000';
  const tokenPaidAddr = normalizeOptionalAddress(token_paid);
  const amountRaw = String(amount_paid_raw).trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert batch
    const batchResult = await client.query(
      `INSERT INTO fee_batches (chain, fee_manager_tx, lp_token, token_paid, amount_paid_raw, block_height)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (fee_manager_tx) DO UPDATE
         SET amount_paid_raw = fee_batches.amount_paid_raw + EXCLUDED.amount_paid_raw
       RETURNING id`,
      [CHAIN_PEAQ, txBuffer, lpTokenAddr, tokenPaidAddr, amountRaw, blockHeightValue]
    );
    const batchId = batchResult.rows[0].id;

    // 2. Upsert holder balances + insert allocations
    for (const alloc of allocations) {
      if (!alloc.holder_address || !alloc.amount_raw) continue;

      const holderAddr = alloc.holder_address;
      const allocAmount = String(alloc.amount_raw).trim();
      const nftCount = Number(alloc.nft_count) || 0;

      // Ensure holder exists in dsfo_holder_balances (FK requirement)
      await client.query(
        `INSERT INTO dsfo_holder_balances (holder_address, nft_balance, tracked_shares)
         VALUES ($1, $2, $2)
         ON CONFLICT (holder_address) DO UPDATE
           SET nft_balance = $2, updated_at = NOW()`,
        [holderAddr, nftCount]
      );

      // Insert allocation
      await client.query(
        `INSERT INTO fee_allocations (batch_id, holder_address, amount_raw)
         VALUES ($1, $2, $3)
         ON CONFLICT (batch_id, holder_address) DO UPDATE
           SET amount_raw = fee_allocations.amount_raw + EXCLUDED.amount_raw`,
        [batchId, holderAddr, allocAmount]
      );
    }

    await client.query('COMMIT');

    res.status(200).json({ success: true, batch: { id: batchId } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording fee batch:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /fee-batches
 *
 * Returns all fee batches, most recent first.
 */
router.get('/fee-batches', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, chain, lp_token, token_paid, amount_paid_raw, block_height, executed_at,
              encode(fee_manager_tx, 'hex') AS fee_manager_tx
         FROM fee_batches
        WHERE chain = $1
        ORDER BY executed_at DESC`,
      [CHAIN_PEAQ]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching fee batches:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /fee-allocations/:batchId
 *
 * Returns per-holder allocations for a specific batch.
 */
router.get('/fee-allocations/:batchId', async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!Number.isInteger(batchId) || batchId <= 0) {
    return res.status(400).json({ error: 'batchId must be a positive integer' });
  }

  try {
    const result = await pool.query(
      `SELECT fa.holder_address, fa.amount_raw,
              dhb.nft_balance
         FROM fee_allocations fa
         LEFT JOIN dsfo_holder_balances dhb ON dhb.holder_address = fa.holder_address
        WHERE fa.batch_id = $1
        ORDER BY fa.amount_raw DESC`,
      [batchId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching fee allocations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /getAggregatedAllocations
 *
 * Aggregated view across all batches — total allocated per token, DEX-wide.
 * Joins with fee_batches to get the token symbol.
 */
router.get('/getAggregatedAllocations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fb.token_paid,
              SUM(fb.amount_paid_raw) AS total_raw
         FROM fee_batches fb
        WHERE fb.chain = $1
        GROUP BY fb.token_paid
        ORDER BY total_raw DESC`,
      [CHAIN_PEAQ]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching aggregated allocations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /getAggregatedAllocations/:user_address
 *
 * Per-user aggregated allocations across all batches.
 */
router.get('/getAggregatedAllocations/:user_address', async (req, res) => {
  const { user_address } = req.params;

  try {
    const result = await pool.query(
      `SELECT fb.token_paid,
              SUM(fa.amount_raw) AS total_raw
         FROM fee_allocations fa
         JOIN fee_batches fb ON fb.id = fa.batch_id
        WHERE fb.chain = $1 AND fa.holder_address = $2
        GROUP BY fb.token_paid
        ORDER BY total_raw DESC`,
      [CHAIN_PEAQ, user_address]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching user allocations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
