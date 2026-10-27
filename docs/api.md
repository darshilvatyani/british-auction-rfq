# RFQ API

The API accepts JSON. Field names use camelCase, timestamps are returned in UTC, and responses include `serverTime` for client clock synchronization. RFQ and supplier IDs are positive integers.

## Create an RFQ

`POST /api/rfqs`

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Yes | Non-empty string, at most 150 characters after trimming |
| `referenceId` | Yes | Unique reference, at most 60 characters after trimming and uppercasing |
| `bidStartTime` | Yes | ISO timestamp with seconds and timezone |
| `bidCloseTime` | Yes | ISO timestamp strictly later than bid start |
| `pickupDate` | Yes | Valid calendar date in YYYY-MM-DD format |
| `currency` | No | Three-letter code; defaults to INR and is uppercased |
| `britishAuctionEnabled` | No | Boolean; defaults to true |
| `forcedCloseTime` | For British Auctions | Strictly later than the original bid close |
| `triggerWindowMinutes` | For British Auctions | Positive integer, at most 2147483647 |
| `extensionMinutes` | For British Auctions | Positive integer, at most 2147483647 |
| `extensionTrigger` | For British Auctions | ANY_BID, ANY_RANK_CHANGE, or L1_CHANGE |

`bidCloseTime` initializes both `initialCloseTime` and `currentCloseTime`. Clients cannot set the current deadline, lowest bid, or closure fields directly. If British Auction is disabled, forced close and extension fields are ignored and saved as null. Historical and already-started dates are allowed; the API computes their status from the deadlines.

Success returns HTTP 201, a `Location` header pointing to the new RFQ, and:

```json
{
  "rfq": {
    "id": 1,
    "name": "Mumbai to Pune freight",
    "referenceId": "RFQ-001",
    "bidStartTime": "2026-11-01T04:30:00.000Z",
    "initialCloseTime": "2026-11-01T05:30:00.000Z",
    "currentCloseTime": "2026-11-01T05:30:00.000Z",
    "forcedCloseTime": "2026-11-01T06:30:00.000Z",
    "pickupDate": "2026-11-03",
    "currency": "INR",
    "britishAuctionEnabled": true,
    "triggerWindowMinutes": 10,
    "extensionMinutes": 5,
    "extensionTrigger": "ANY_BID",
    "lowestBid": null,
    "status": "Upcoming",
    "closedAt": null,
    "closeReason": null,
    "createdAt": "2026-10-26T17:00:00.000Z",
    "updatedAt": "2026-10-26T17:00:00.000Z"
  },
  "serverTime": "2026-10-26T17:00:00.000Z"
}
```

Dates and IDs above are illustrative. Actual status depends on server time.

## List British Auctions

`GET /api/rfqs`

Returns HTTP 200 with `{ "rfqs": [ ... ], "serverTime": "..." }`. Each RFQ has the fields shown above. Auctions are ordered newest first. The response includes British Auctions only; it returns an empty array when none exist.

`lowestBid` is the minimum total among the latest accepted quotes for each supplier. It is null when there are no bids. Amounts use integer minor units of the RFQ currency, so `10300` means INR 103.00 for an INR auction.

## Get RFQ details

`GET /api/rfqs/:rfqId`

Returns HTTP 200 with `{ "rfq": { ... }, "serverTime": "..." }`. Both British and regular RFQs can be retrieved by ID. Invalid IDs return 400; valid IDs with no matching RFQ return 404.

Status is calculated at read time: Upcoming before start, Active before the current deadline, Closed after a normal deadline, and Force Closed when an auction ends at its forced deadline. An auction that closed normally remains Closed even after its forced-close timestamp passes.

## Submit a quote

`POST /api/rfqs/:rfqId/bids`

Use an active RFQ and a supplier ID from `/api/suppliers`. Generate a new UUID for every new submission or price revision; preserve it when retrying the same request.

| Field | Rules |
| --- | --- |
| `supplierId` | Existing positive integer supplier ID |
| `requestId` | UUID, normalized to lowercase |
| `carrierName` | Non-empty string, at most 150 characters after trimming |
| `freightCharges` | Non-negative safe integer in currency minor units |
| `originCharges` | Non-negative safe integer in currency minor units |
| `destinationCharges` | Non-negative safe integer in currency minor units |
| `transitDays` | Positive whole number, at most 2147483647 |
| `quoteValidUntil` | ISO timestamp with seconds and timezone, later than acceptance time |

All fields are required. Total charges must be positive and at most 9007199254740991. The server calculates the total; client-supplied totals, ranks, timestamps, and deadlines are ignored. A revision must have a lower total than that supplier's previous accepted quote. It can remain above the lowest bidder.

```json
{
  "supplierId": 1,
  "requestId": "2ae34280-b430-47d5-8009-833029574262",
  "carrierName": "Demo Carrier",
  "freightCharges": 10000,
  "originCharges": 100,
  "destinationCharges": 200,
  "transitDays": 2,
  "quoteValidUntil": "2026-11-05T00:00:00Z"
}
```

The total is 10300 minor units, or INR 103.00 for an INR RFQ. Update example dates and identifiers to match your auction.

New submissions return HTTP 201:

| Response field | Contents |
| --- | --- |
| `bid` | Accepted bid ID, RFQ/supplier IDs, supplier name/code, request ID, quote fields, calculated total, and submission timestamp |
| `rankings` | One current quote per supplier, sorted by total, with the bid fields and a `rank` label such as L1 or L2 |
| `rfq` | Updated RFQ using the same fields as the details endpoint |
| `extension` | Null, or the reason, previousCloseTime, and newCloseTime for this bid's extension |
| `replayed` | False for a newly accepted bid |
| `serverTime` | UTC response timestamp from the database clock |

Equal totals favour the quote accepted earlier, then the lower bid ID. Price-only improvements do not count as rank changes; new suppliers entering the rankings do. An L1 change compares the supplier identity, including the first supplier establishing L1.

Within the current X-minute trigger window, the selected trigger can add Y minutes to the current close time. Extensions are capped at forced close. A qualifying bid when the deadline is already at the cap does not create a zero-length extension entry.

### Retries

The request ID is scoped to the RFQ and supplier. A matching retry returns HTTP 200 with `replayed: true`, the original accepted bid, and that bid's original extension. `rfq`, `rankings`, and `serverTime` reflect current state, so the returned bid may have since been superseded by a newer quote. No bid, deadline update, or activity is written during a replay.

Retries work after the deadline or the original quote validity has passed, because the original request was already accepted. Changing the quote fields while reusing the ID returns HTTP 409. Use a new ID for a revision.

Bids are checked against the database wall clock after the RFQ lock is acquired. Before start, at/after current close, or at/after forced close, new submissions return 409. An expired quote validity or a revision that does not lower the supplier's previous total returns 400. Invalid fields return field-level errors; missing RFQs or suppliers return 404.

Bid submission, extensions, and activity writes commit together. If any write fails, all changes roll back.

## Get current rankings and bid history

`GET /api/rfqs/:rfqId/bids`

Returns HTTP 200 with:

| Field | Contents |
| --- | --- |
| `rankings` | Latest accepted quote per supplier, sorted by total ascending, with L1/L2/L3 rank labels |
| `history` | Every accepted submission, including current quotes and previous revisions, newest first |
| `serverTime` | UTC database server time |

Both arrays use the bid fields returned by quote submission: ID, RFQ/supplier IDs, supplier name/code, request ID, carrier name, three charge amounts, calculated total, transit days, quote validity, and submission timestamp. Rankings additionally include `rank`.

Ties in price favour the earlier accepted quote, then lower bid ID. History breaks equal submission timestamps by higher ID first. Amounts are numeric integer minor units of the RFQ currency. Expired quote validity does not remove historical bids or change the final rankings.

An RFQ without bids returns empty arrays. Closed and regular RFQs remain readable. Invalid IDs return 400, and missing RFQs return 404. The endpoint uses a consistent read-only database snapshot without locking the RFQ.

## Get activity history

`GET /api/rfqs/:rfqId/activities`

Returns HTTP 200 with `{ "activities": [ ... ], "serverTime": "..." }`. Entries are newest first, ordered by creation time and then higher activity ID.

| Activity field | Contents |
| --- | --- |
| `id`, `rfqId` | Activity and associated RFQ identifiers |
| `supplierId`, `supplierName`, `supplierCode` | Related supplier, or null for closure entries |
| `bidId` | Associated bid, or null for closure |
| `eventType` | BID_SUBMITTED, AUCTION_EXTENDED, or AUCTION_CLOSED |
| `reason` | Readable event reason |
| `previousCloseTime`, `newCloseTime` | Previous/new UTC deadlines for extensions; otherwise null |
| `createdAt` | UTC event timestamp |

Extensions include the actual capped deadline change, and no entry is created for a zero-length extension. Closure has one activity per RFQ. Its timestamp matches `rfq.closedAt`; whether it was normal or forced is recorded in `rfq.closeReason` and described by the reason.

An RFQ without activity returns an empty array. Invalid IDs return 400; missing RFQs return 404. Reads do not create closure events or update the RFQ.

## Automatic closure

The API reconciles overdue auctions before listening at startup, then checks again one second after each closing pass finishes. It records `closedAt`, `closeReason`, and one closure activity together. `NORMAL` means the auction ended before forced close; `FORCED` means the effective deadline reached the forced-close cap. Regular RFQs close normally at their fixed deadline.

`currentCloseTime` is the bidding deadline. `closedAt` is when the server recorded closure, which can be later after downtime. Status still reflects the deadline if the closing job is delayed, and new bids remain blocked. The deadline is rechecked after obtaining the RFQ lock, so an intervening extension is respected. Matching retries of already accepted bids remain readable after closure.

## Live auction notifications

Socket.IO uses `/socket.io` on the same server as the API. Vite proxies this path, including WebSocket upgrades. Subscribe after each connection or reconnect:

| Client event | Arguments | Membership |
| --- | --- | --- |
| `auctions:watch` | Acknowledgement callback | All auction listing updates |
| `auction:watch` | RFQ ID, acknowledgement callback | Updates for one RFQ |

The acknowledgement is `{ "ok": true }`. Invalid RFQ IDs receive `{ "ok": false, "message": "Invalid RFQ ID." }`; room subscription does not check whether an RFQ exists. These are read-only demo subscriptions without authentication. Disconnecting removes room memberships.

The server emits `auction:updated` with `{ "rfqId": 1, "type": "BID_SUBMITTED", "serverTime": "..." }`. Types are `RFQ_CREATED`, `BID_SUBMITTED`, and `AUCTION_CLOSED`. Bid notifications also cover any associated extension. Listing subscribers and the affected RFQ room receive the update once, after the write commits. Replays, rejected bids, and rolled-back transactions emit nothing. Event time is the Node process notification time; use REST `serverTime` for the countdown.

Events tell clients to refetch REST snapshots; they are not a persistent event stream. Subscribe before fetching after a reconnect. The frontend also refetches on deadline transitions, window focus, and every 30 seconds to recover missed updates.

## List suppliers

`GET /api/suppliers`

Returns HTTP 200:

```json
{
  "suppliers": [
    { "id": 1, "code": "SUP-001", "name": "BlueLine Logistics" },
    { "id": 2, "code": "SUP-002", "name": "Coastal Freight" },
    { "id": 3, "code": "SUP-003", "name": "NorthStar Carriers" }
  ],
  "serverTime": "2026-10-26T17:00:00.000Z"
}
```

Suppliers are ordered by code. Seed reruns preserve existing supplier records and do not create duplicates.

## Errors

Validation errors return HTTP 400 with field-level messages:

```json
{
  "message": "Please check the RFQ fields.",
  "errors": {
    "forcedCloseTime": "Forced close time must be later than bid close time."
  }
}
```

| Status | Meaning |
| --- | --- |
| 400 | Invalid input, malformed JSON, invalid RFQ ID, expired quote validity, or a revision that does not lower the previous total |
| 404 | Unknown route, RFQ, or supplier |
| 409 | RFQ reference already exists, bidding is not open, or a request ID was reused with different quote fields |
| 503 | Database unavailable or migrations not applied |
| 500 | Unexpected server error |

Unexpected database errors are logged on the server; responses do not include SQL, stack traces, or connection credentials.
