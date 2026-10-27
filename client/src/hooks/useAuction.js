import { useCallback, useEffect, useRef, useState } from 'react';
import { getRfq, getBids, getActivities } from '../api/rfqApi.js';
import { watchAuction } from '../api/auctionSocket.js';
import { createClockSample, getServerNow, getNextBoundary } from '../utils/auctionTime.js';

export function useAuction(rfqId) {
  const [state, setState] = useState({ rfq: null, rankings: [], history: [], activities: [], clock: null, isLoading: true, error: '' });
  const [now, setNow] = useState(0);
  const [connection, setConnection] = useState('connecting');
  const refreshRef = useRef(null);
  const refresh = useCallback(() => refreshRef.current?.(), []);

  useEffect(() => {
    let stopped = false;
    let loading = false;
    let queued = false;
    let controller;

    async function load() {
      if (stopped) return;
      if (loading) {
        queued = true;
        return;
      }

      loading = true;
      controller = new AbortController();
      const sentAt = performance.now();

      try {
        let clock;
        const [details, bids, activity] = await Promise.all([
          getRfq(rfqId, controller.signal).then((data) => {
            clock = createClockSample(data.serverTime, sentAt, performance.now());
            return data;
          }),
          getBids(rfqId, controller.signal),
          getActivities(rfqId, controller.signal),
        ]);

        if (!stopped && !queued) {
          setState({ rfq: details.rfq, rankings: bids.rankings, history: bids.history, activities: activity.activities, clock, isLoading: false, error: '' });
          setNow(getServerNow(clock, performance.now()));
        }
      } catch (err) {
        if (!stopped) {
          setState((previous) => ({ ...previous, isLoading: false, error: err.message }));
        }
      } finally {
        controller.abort();
        loading = false;

        if (queued && !stopped) {
          queued = false;
          load();
        }
      }
    }

    refreshRef.current = load;
    load();
    const stopWatching = watchAuction(rfqId, load, setConnection);

    return () => {
      stopped = true;
      controller?.abort();
      stopWatching();
      refreshRef.current = null;
    };
  }, [rfqId]);

  useEffect(() => {
    if (!state.clock || !state.rfq) return;
    const boundary = getNextBoundary(state.rfq, state.clock.serverTime);
    let checked = false;
    const timer = setInterval(() => {
      const serverNow = getServerNow(state.clock, performance.now());
      setNow(serverNow);
      if (!checked && boundary !== null && serverNow >= boundary) {
        checked = true;
        refresh();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [state.clock, state.rfq, refresh]);

  return { ...state, now, connection, refresh };
}
