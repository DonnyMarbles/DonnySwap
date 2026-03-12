import express from 'express';
import cors from 'cors';

import marketRoutes from './routes/marketRoutes.js';
import feesRoutes from './routes/feesRoutes.js';
import dsfoRoutes from './routes/dsfoRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import nftRoutes from './routes/nftRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import { startMemoryUsageLogger } from './services/memoryLogger.js';

const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  app.use(express.json());
  startMemoryUsageLogger();

  app.use(marketRoutes);
  app.use(feesRoutes);
  app.use(dsfoRoutes);
  app.use(tokenRoutes);
  app.use(nftRoutes);
  app.use(batchRoutes);

  return app;
};

export default createApp;

