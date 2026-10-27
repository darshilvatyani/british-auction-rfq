import { io } from 'socket.io-client';

export function watchAuction(rfqId, onUpdate, onStatus) {
  if (import.meta.env.PROD) {
    onStatus('polling');
    const refresh = () => { if (!document.hidden) onUpdate(); };
    const timer = setInterval(refresh, 2000);
    window.addEventListener('focus', refresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }

  const socket = io({ autoConnect: false, forceNew: true });
  let stopped = false;

  socket.on('connect', () => {
    const acknowledge = (err, response) => {
      if (stopped) return;

      if (err || !response?.ok) {
        onStatus('offline');
        return;
      }

      onStatus('live');
      onUpdate();
    };

    if (rfqId === null) {
      socket.timeout(5000).emit('auctions:watch', acknowledge);
    } else {
      socket.timeout(5000).emit('auction:watch', rfqId, acknowledge);
    }
  });

  socket.on('auction:updated', () => { if (!stopped) onUpdate(); });
  socket.on('disconnect', () => { if (!stopped) onStatus('offline'); });
  socket.on('connect_error', () => { if (!stopped) onStatus('offline'); });
  socket.connect();

  const refresh = () => { if (!stopped) onUpdate(); };
  const fallback = setInterval(refresh, 30000);
  window.addEventListener('focus', refresh);

  return () => {
    stopped = true;
    clearInterval(fallback);
    window.removeEventListener('focus', refresh);
    socket.removeAllListeners();
    socket.disconnect();
  };
}
