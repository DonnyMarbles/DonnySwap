import { Pool } from 'pg';

import { DEFAULT_PG_PORT, SHOULD_DISABLE_SSL } from '../config/constants.js';

const buildPoolConfig = () => {
  const config = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        user: process.env.PGUSER || '',
        host: process.env.PGHOST || '',
        database: process.env.PGDATABASE || '',
        password: process.env.PGPASSWORD || '',
        port: DEFAULT_PG_PORT,
      };

  if (
    !config.connectionString &&
    (!config.user || !config.host || !config.database || !config.password)
  ) {
    console.warn(
      'PostgreSQL configuration is incomplete. Provide DATABASE_URL or PG* environment variables.'
    );
  }

  config.ssl = SHOULD_DISABLE_SSL
    ? false
    : {
        rejectUnauthorized: false,
      };

  return config;
};

const pool = new Pool(buildPoolConfig());

export { pool };

