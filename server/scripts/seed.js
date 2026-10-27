import { readFile } from 'node:fs/promises';
import pool from '../src/db/pool.js';

let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  const suppliers = await readFile(new URL('../db/seeds/suppliers.sql', import.meta.url), 'utf8');
  const rfqs = await readFile(new URL('../db/seeds/rfqs.sql', import.meta.url), 'utf8');
  await client.query(suppliers);
  const result = await client.query(rfqs);
  await client.query('COMMIT');
  console.log('Demo suppliers and two sample RFQs are ready.');
  for (const rfq of result.rows) {
    console.log(`${rfq.reference_id}: /rfqs/${rfq.id}`);
  }
} catch (err) {
  if (client) await client.query('ROLLBACK');
  console.error(`Seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
