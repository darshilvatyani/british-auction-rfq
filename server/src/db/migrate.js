import { readdir, readFile } from 'node:fs/promises';
import pool from './pool.js';

const migrationDirectory = new URL('../../db/migrations/', import.meta.url);

export async function runMigrations() {
  const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();
  const client = await pool.connect();
  const applied = [];

  try {
    await client.query('BEGIN');
    // Prevent two migration commands from applying the same file at once.
    await client.query('SELECT pg_advisory_xact_lock(784201)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const result = await client.query('SELECT filename FROM schema_migrations');
    const completed = new Set(result.rows.map((row) => row.filename));

    for (const file of files) {
      if (completed.has(file)) {
        continue;
      }

      const sql = await readFile(new URL(file, migrationDirectory), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      applied.push(file);
    }

    await client.query('COMMIT');
    return applied;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
