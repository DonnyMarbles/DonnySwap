import { Router } from 'express';

import { pool } from '../db/pool.js';
import { parseInteger, toBufferFromHex } from '../utils/data.js';

const router = Router();

router.post('/dsfo/mint', async (req, res) => {
  const {
    token_id,
    minter_address,
    mint_tx_hash,
    burned_lp_token = null,
    burned_lp_amount,
  } = req.body || {};
  console.log('DSFO mint payload:', {
    token_id,
    minter_address,
    mint_tx_hash,
    burned_lp_token,
    burned_lp_amount,
  });

  if (!token_id || !minter_address || burned_lp_amount == null) {
    return res
      .status(400)
      .json({ error: 'token_id, minter_address, and burned_lp_amount are required' });
  }

  const tokenIdValue = parseInteger(token_id);
  if (tokenIdValue === null || tokenIdValue <= 0) {
    return res.status(400).json({ error: 'token_id must be a positive integer' });
  }

  const burnedAmountString = String(burned_lp_amount).trim();
  if (!/^\d+$/.test(burnedAmountString)) {
    return res.status(400).json({ error: 'burned_lp_amount must be an integer string' });
  }

  let txBuffer;
  try {
    txBuffer = toBufferFromHex(mint_tx_hash, 'mint_tx_hash');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const result = await pool.query(
      `INSERT INTO dsfo_mints (token_id, minter_address, mint_tx_hash, burned_lp_token, burned_lp_amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token_id) DO UPDATE
       SET minter_address = EXCLUDED.minter_address,
           mint_tx_hash = CASE
             WHEN octet_length(EXCLUDED.mint_tx_hash) > 0 THEN EXCLUDED.mint_tx_hash
             ELSE dsfo_mints.mint_tx_hash
           END,
           burned_lp_token = EXCLUDED.burned_lp_token,
           burned_lp_amount = EXCLUDED.burned_lp_amount
       RETURNING *`,
      [tokenIdValue, minter_address, txBuffer, burned_lp_token, burnedAmountString]
    );
    res.status(200).json({ success: true, mint: result.rows[0] });
  } catch (err) {
    console.error('Error recording DSFO mint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/dsfo/burn', async (req, res) => {
  const { token_id, burner_address, burn_tx_hash } = req.body || {};
  console.log('DSFO burn payload:', { token_id, burner_address, burn_tx_hash });

  if (!token_id || !burner_address) {
    return res.status(400).json({ error: 'token_id and burner_address are required' });
  }

  const tokenIdValue = parseInteger(token_id);
  if (tokenIdValue === null || tokenIdValue <= 0) {
    return res.status(400).json({ error: 'token_id must be a positive integer' });
  }

  let txBuffer;
  try {
    txBuffer = toBufferFromHex(burn_tx_hash, 'burn_tx_hash');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const result = await pool.query(
      `INSERT INTO dsfo_burns (token_id, burner_address, burn_tx_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (token_id) DO UPDATE
       SET burner_address = EXCLUDED.burner_address,
           burn_tx_hash = CASE
             WHEN octet_length(EXCLUDED.burn_tx_hash) > 0 THEN EXCLUDED.burn_tx_hash
             ELSE dsfo_burns.burn_tx_hash
           END,
           burned_at = NOW()
       RETURNING *`,
      [tokenIdValue, burner_address, txBuffer]
    );
    res.status(200).json({ success: true, burn: result.rows[0] });
  } catch (err) {
    console.error('Error recording DSFO burn:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/dsfo/holder-balance', async (req, res) => {
  const { holder_address, nft_balance, tracked_shares } = req.body || {};
  console.log('DSFO holder balance payload:', { holder_address, nft_balance, tracked_shares });

  if (!holder_address) {
    return res.status(400).json({ error: 'holder_address is required' });
  }

  const balanceValue = parseInteger(nft_balance);
  if (balanceValue === null || balanceValue < 0) {
    return res.status(400).json({ error: 'nft_balance must be a non-negative integer' });
  }

  const trackedSharesValue =
    tracked_shares !== undefined && tracked_shares !== null ? String(tracked_shares) : '0';
  if (!/^\d+$/.test(trackedSharesValue)) {
    return res.status(400).json({ error: 'tracked_shares must be an integer string' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO dsfo_holder_balances (holder_address, nft_balance, tracked_shares)
       VALUES ($1, $2, $3)
       ON CONFLICT (holder_address) DO UPDATE
       SET nft_balance = EXCLUDED.nft_balance,
           tracked_shares = EXCLUDED.tracked_shares,
           updated_at = NOW()
       RETURNING *`,
      [holder_address, balanceValue, trackedSharesValue]
    );
    res.status(200).json({ success: true, holder: result.rows[0] });
  } catch (err) {
    console.error('Error syncing DSFO holder balance:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

