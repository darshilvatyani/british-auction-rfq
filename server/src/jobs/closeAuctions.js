import { closeExpiredAuctions } from '../services/closingService.js';

export async function startAuctionCloser(intervalMs = 1000, keepAlive = false) {
  await closeExpiredAuctions();

  let stopped = false;
  let running = null;
  let timer;

  async function tick() {
    if (stopped) {
      return;
    }

    running = closeExpiredAuctions();

    try {
      await running;
    } catch (err) {
      console.error('Auction closing check failed:', err);
    } finally {
      running = null;

      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
        if (!keepAlive) timer.unref();
      }
    }
  }

  timer = setTimeout(tick, intervalMs);
  if (!keepAlive) timer.unref();

  return async function stop() {
    stopped = true;
    clearTimeout(timer);

    if (running) {
      await running.catch(() => {});
    }
  };
}
