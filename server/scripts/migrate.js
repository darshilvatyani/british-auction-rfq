import pool from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';

try {
  const applied = await runMigrations();
  console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'Database is up to date.');
} catch (err) {
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
