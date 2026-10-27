WITH schedule AS (
  SELECT date_trunc('minute', clock_timestamp()) AS base_time
)
INSERT INTO rfqs (
  name, reference_id, bid_start_time, initial_close_time, current_close_time,
  forced_close_time, pickup_date, currency, british_auction_enabled,
  trigger_window_minutes, extension_minutes, extension_trigger
)
SELECT
  'Mumbai to Pune freight', 'DEMO-001', base_time - INTERVAL '5 minutes',
  base_time + INTERVAL '5 minutes', base_time + INTERVAL '5 minutes',
  base_time + INTERVAL '30 minutes', (base_time + INTERVAL '2 days')::date,
  'INR', TRUE, 10, 5, 'ANY_BID'
FROM schedule
UNION ALL
SELECT
  'Delhi to Jaipur freight', 'DEMO-002', base_time + INTERVAL '10 minutes',
  base_time + INTERVAL '25 minutes', base_time + INTERVAL '25 minutes',
  base_time + INTERVAL '45 minutes', (base_time + INTERVAL '2 days')::date,
  'INR', TRUE, 10, 5, 'L1_CHANGE'
FROM schedule
ON CONFLICT (reference_id) DO NOTHING
RETURNING id, reference_id;
