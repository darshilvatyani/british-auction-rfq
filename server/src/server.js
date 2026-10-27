import app from './app.js';
import { createServer } from 'node:http';
import { port } from './config/env.js';
import pool from './db/pool.js';
import { startAuctionCloser } from './jobs/closeAuctions.js';
import { attachAuctionSocket } from './sockets/auctionSocket.js';

async function startServer() {
  const stopAuctionCloser = await startAuctionCloser();
  const server = createServer(app);
  const io = attachAuctionSocket(server);
  server.listen(port);
  let stopping = false;

  server.on('listening', () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  async function shutdown(exitCode = 0) {
    if (stopping) {
      return;
    }

    stopping = true;
    try {
      await Promise.all([
        stopAuctionCloser(),
        new Promise((resolve) => io.close(resolve)),
      ]);
    } finally {
      await pool.end();
      process.exitCode = exitCode;
    }
  }

  function stop(exitCode) {
    shutdown(exitCode).catch((err) => {
      console.error('Could not shut down cleanly:', err.message);
      process.exit(1);
    });
  }

  server.on('error', (err) => {
    console.error(`Could not start server: ${err.message}`);
    stop(1);
  });

  process.on('SIGINT', () => stop(0));
  process.on('SIGTERM', () => stop(0));
}

startServer().catch(async (err) => {
  console.error('Could not start server:', err.message);
  try {
    await pool.end();
  } finally {
    process.exitCode = 1;
  }
});
