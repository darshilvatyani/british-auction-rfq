INSERT INTO suppliers (code, name)
VALUES
  ('SUP-001', 'BlueLine Logistics'),
  ('SUP-002', 'Coastal Freight'),
  ('SUP-003', 'NorthStar Carriers')
ON CONFLICT (code) DO NOTHING;
