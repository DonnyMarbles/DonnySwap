#!/usr/bin/env node
import { Pool } from 'pg';
import 'dotenv/config';

const resolvePort = () => {
  if (process.env.PGPORT) return Number(process.env.PGPORT);
  if (process.env.DEFAULT_PG_PORT) return Number(process.env.DEFAULT_PG_PORT);
  return 25060;
};

const shouldDisableSsl = (process.env.PGSSL || '').toLowerCase() === 'false';

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.PGUSER || '',
      host: process.env.PGHOST || '',
      database: process.env.PGDATABASE || '',
      password: process.env.PGPASSWORD || '',
      port: resolvePort(),
    };

if (
  !poolConfig.connectionString &&
  (!poolConfig.user || !poolConfig.host || !poolConfig.database || !poolConfig.password)
) {
  console.error(
    'PostgreSQL configuration is incomplete. Provide DATABASE_URL or PG* environment variables.'
  );
  process.exit(1);
}

if (!shouldDisableSsl) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
} else {
  poolConfig.ssl = false;
}

const pool = new Pool(poolConfig);

const purgeQueries = [
  { label: 'PEAQ user fees', sql: 'DELETE FROM "user_fees" WHERE chain = \'PEAQ\';' },
  {
    label: 'PEAQ block listener progress',
    sql: 'DELETE FROM "block_listener_progress" WHERE chain = \'PEAQ\';',
  },
];

const purgePeaqFees = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { label, sql } of purgeQueries) {
      const result = await client.query(sql);
      console.log(`Deleted ${result.rowCount} rows from ${label}`);
    }
    await client.query('COMMIT');
    console.log('PEAQ fee data purged successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to purge PEAQ fee tables:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

purgePeaqFees();

