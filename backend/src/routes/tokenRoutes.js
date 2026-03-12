import { Router } from 'express';

import { computeTokenBalances } from '../services/tokenBalancesService.js';
import { setCorsHeaders } from '../utils/http.js';

const router = Router();

router.post('/token-balances', async (req, res) => {
  setCorsHeaders(res);
  try {
    const { userAddress, tokens } = req.body || {};
    const result = await computeTokenBalances({ userAddress, tokens });
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to compute token balances:', error);
    const message = error?.message || 'Failed to compute token balances';
    const status = /required|invalid/i.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;


