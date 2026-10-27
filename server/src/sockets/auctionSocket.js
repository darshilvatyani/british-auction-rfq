import { Server } from 'socket.io';
import { clientOrigin } from '../config/env.js';

let auctionServer;

export function attachAuctionSocket(server) {
  const io = new Server(server, { cors: { origin: clientOrigin } });
  auctionServer = io;

  io.on('connection', (socket) => {
    socket.on('auctions:watch', async (acknowledge) => {
      await socket.join('auction-list');

      if (typeof acknowledge === 'function') {
        acknowledge({ ok: true });
      }
    });

    socket.on('auction:watch', async (rfqId, acknowledge) => {
      if (!['string', 'number'].includes(typeof rfqId)
        || !/^[1-9]\d*$/.test(rfqId) || Number(rfqId) > 2147483647) {
        if (typeof acknowledge === 'function') {
          acknowledge({ ok: false, message: 'Invalid RFQ ID.' });
        }
        return;
      }

      await socket.join(`rfq:${Number(rfqId)}`);

      if (typeof acknowledge === 'function') {
        acknowledge({ ok: true });
      }
    });
  });

  return io;
}

export function publishAuctionUpdate(rfqId, type) {
  if (!auctionServer) {
    return;
  }

  try {
    auctionServer.to('auction-list').to(`rfq:${rfqId}`).emit('auction:updated', {
      rfqId, type, serverTime: new Date().toISOString(),
    });
  } catch (err) {
    // A notification failure must not turn an already committed write into an API failure.
    console.error('Could not publish auction update:', err);
  }
}
