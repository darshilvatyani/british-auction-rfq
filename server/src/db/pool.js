import pg from 'pg';
import { databaseUrl } from '../config/env.js';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Set it in server/.env before starting the API.');
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: process.env.VERCEL ? 3 : 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error(`Database connection error: ${err.message}`);
});

export default pool;
