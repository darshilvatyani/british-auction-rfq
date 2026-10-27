import pool from './db/pool.js';
import { startAuctionCloser } from './jobs/closeAuctions.js';

try {
  const stopCloser = await startAuctionCloser(1000, true);
  let stopping = false;

  async function shutdown() {
    if (stopping) return;
    stopping = true;
    await stopCloser();
    await pool.end();
  }

  function stop() {
    shutdown().catch((err) => {
      console.error('Could not stop auction worker:', err.message);
      process.exit(1);
    });
  }

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  console.log('Auction closing worker started.');
} catch (err) {
  console.error('Could not start auction worker:', err.message);
  await pool.end();
  process.exitCode = 1;
}
