CREATE UNIQUE INDEX activities_rfq_closure_key
  ON activities (rfq_id)
  WHERE event_type = 'AUCTION_CLOSED';
