import { attachDatabasePool } from '@vercel/functions';
import app from './app.js';
import pool from './db/pool.js';

attachDatabasePool(pool);

export default app;
