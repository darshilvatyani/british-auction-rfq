CREATE TABLE suppliers (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE CHECK (btrim(code) <> ''),
  name VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rfqs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
  reference_id VARCHAR(60) NOT NULL,
  bid_start_time TIMESTAMPTZ NOT NULL,
  initial_close_time TIMESTAMPTZ NOT NULL,
  current_close_time TIMESTAMPTZ NOT NULL,
  forced_close_time TIMESTAMPTZ,
  pickup_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  british_auction_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_window_minutes INTEGER,
  extension_minutes INTEGER,
  extension_trigger VARCHAR(30),
  closed_at TIMESTAMPTZ,
  close_reason VARCHAR(10) CHECK (close_reason IN ('NORMAL', 'FORCED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rfqs_reference_id_key UNIQUE (reference_id),
  CONSTRAINT rfqs_reference_format CHECK (
    reference_id <> '' AND reference_id = upper(btrim(reference_id))
  ),
  CONSTRAINT rfqs_date_order CHECK (
    bid_start_time < initial_close_time AND current_close_time >= initial_close_time
  ),
  CONSTRAINT rfqs_auction_config CHECK (
    (
      british_auction_enabled
      AND forced_close_time IS NOT NULL
      AND forced_close_time > initial_close_time
      AND current_close_time <= forced_close_time
      AND trigger_window_minutes IS NOT NULL AND trigger_window_minutes > 0
      AND extension_minutes IS NOT NULL AND extension_minutes > 0
      AND extension_trigger IS NOT NULL
      AND extension_trigger IN ('ANY_BID', 'ANY_RANK_CHANGE', 'L1_CHANGE')
    )
    OR (
      NOT british_auction_enabled
      AND current_close_time = initial_close_time
      AND forced_close_time IS NULL
      AND trigger_window_minutes IS NULL
      AND extension_minutes IS NULL
      AND extension_trigger IS NULL
    )
  ),
  CONSTRAINT rfqs_closure_fields CHECK ((closed_at IS NULL) = (close_reason IS NULL)),
  CONSTRAINT rfqs_closure_deadline CHECK (closed_at IS NULL OR closed_at >= current_close_time),
  CONSTRAINT rfqs_forced_close_reason CHECK (
    close_reason IS DISTINCT FROM 'FORCED'
    OR (british_auction_enabled AND current_close_time = forced_close_time)
  )
);

CREATE TABLE bids (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  request_id UUID NOT NULL,
  carrier_name VARCHAR(150) NOT NULL CHECK (btrim(carrier_name) <> ''),
  freight_charges BIGINT NOT NULL CHECK (freight_charges BETWEEN 0 AND 9007199254740991),
  origin_charges BIGINT NOT NULL CHECK (origin_charges BETWEEN 0 AND 9007199254740991),
  destination_charges BIGINT NOT NULL CHECK (destination_charges BETWEEN 0 AND 9007199254740991),
  total_amount BIGINT GENERATED ALWAYS AS (
    freight_charges + origin_charges + destination_charges
  ) STORED,
  transit_days INTEGER NOT NULL CHECK (transit_days > 0),
  quote_valid_until TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT bids_total_amount CHECK (total_amount BETWEEN 1 AND 9007199254740991),
  CONSTRAINT bids_request_id_key UNIQUE (rfq_id, supplier_id, request_id),
  CONSTRAINT bids_rfq_pair UNIQUE (id, rfq_id)
);

CREATE TABLE activities (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  bid_id INTEGER,
  event_type VARCHAR(30) NOT NULL CHECK (
    event_type IN ('BID_SUBMITTED', 'AUCTION_EXTENDED', 'AUCTION_CLOSED')
  ),
  reason TEXT NOT NULL CHECK (btrim(reason) <> ''),
  previous_close_time TIMESTAMPTZ,
  new_close_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT activities_bid_rfq FOREIGN KEY (bid_id, rfq_id) REFERENCES bids(id, rfq_id),
  CONSTRAINT activities_extension_times CHECK (
    event_type <> 'AUCTION_EXTENDED'
    OR (
      previous_close_time IS NOT NULL
      AND new_close_time IS NOT NULL
      AND new_close_time > previous_close_time
    )
  )
);

CREATE INDEX rfqs_created_at_idx ON rfqs (created_at DESC, id DESC);
CREATE INDEX rfqs_open_deadline_idx ON rfqs (current_close_time) WHERE closed_at IS NULL;
CREATE INDEX bids_current_supplier_idx ON bids (rfq_id, supplier_id, submitted_at DESC, id DESC);
CREATE INDEX bids_supplier_idx ON bids (supplier_id);
CREATE INDEX activities_rfq_history_idx ON activities (rfq_id, created_at DESC, id DESC);
CREATE INDEX activities_supplier_idx ON activities (supplier_id);
CREATE INDEX activities_bid_idx ON activities (bid_id, rfq_id);
