# Auction rules

These rules define the intended behavior for the database and auction implementation. Where the assignment leaves a choice open, the assumption is stated here.

## RFQ configuration

- RFQ name and reference identify the auction; the reference is unique.
- References are trimmed and converted to uppercase before saving.
- Bid start time must be earlier than the original bid close time.
- For a British Auction, forced close time must be later than the original close time.
- The current close time starts at the original close time and can reach, but never exceed, forced close.
- Pickup/service date is recorded with the RFQ.
- Trigger window X and extension duration Y must be positive whole numbers in minutes.
- Each British Auction selects one trigger: `ANY_BID`, `ANY_RANK_CHANGE`, or `L1_CHANGE`.
- RFQs without British Auction enabled use their original deadline and do not extend.
- When British Auction is disabled, forced close and extension settings are stored as null.
- API timestamps include seconds and an explicit timezone. Pickup/service date uses YYYY-MM-DD.

## Quote submission and ranking

- A quote includes supplier, carrier, freight charges, origin charges, destination charges, transit time, and quote validity.
- The server calculates the total as freight + origin + destination charges.
- Charges are non-negative and the total must be positive. Transit time must be positive.
- All quotes in an RFQ use the same currency. Demo data uses INR.
- Money is stored as integer minor units, with safe integer limits enforced before calculation.
- A supplier's first quote may be above the current lowest quote.
- A revision must have a strictly lower total than that supplier's previous accepted quote. It does not have to beat L1.
- Rankings use each supplier's latest accepted quote, ordered by total ascending. Earlier bids are retained as history.
- Equal totals favour the quote accepted earlier. The bid ID provides a final deterministic tiebreaker.
- Ranks are consecutive labels: L1, L2, L3, and so on.
- Quote validity is recorded and displayed. Automatic removal of expired quotes from rankings is not part of the initial auction behavior.
- Quote validity must be later than the server's acceptance time for a new submission.
- A new supplier entering the ranking counts as a rank change. The first accepted bid establishes L1 and counts as an L1 change.

## Time boundaries

The server decides whether a bid is accepted. Browser time is only used to display the countdown.

```text
startTime <= bidTime < currentCloseTime
```

A bid at exactly the start time is allowed. A bid at exactly the current or forced close time is rejected. The bid time is checked after acquiring the RFQ row lock; a request waiting for the lock is not guaranteed acceptance based on when it first arrived.

The trigger window is evaluated against the current deadline:

```text
currentCloseTime - X minutes <= bidTime < currentCloseTime
```

Bid submission reads `clock_timestamp()` from PostgreSQL after acquiring the RFQ lock and loading current quotes. It does not use the transaction start time or a client-supplied timestamp as the acceptance time.

## Retrying a submission

Each submission has a UUID request ID scoped to its RFQ and supplier. Repeating the same ID with the same normalized quote fields returns the original bid and its original extension, alongside current RFQ state and rankings. It does not insert activities or extend the deadline again. This also works after the auction has closed because the original bid was already accepted.

Reusing the same ID with different quote fields returns 409. A revised quote needs a new request ID. Newly accepted bids return 201; matching retries return 200 with `replayed: true`.

## Extension triggers

All trigger conditions require an accepted bid inside the trigger window.

| Trigger | Condition | Example |
| --- | --- | --- |
| Any bid | Every accepted bid qualifies | Supplier B lowers its quote but stays L2 |
| Any rank change | At least one supplier's rank changes | Supplier C moves from L3 to L2 while A remains L1 |
| L1 change | The identity of the lowest-priced supplier changes | Supplier B underbids A and becomes L1 |

An L1 supplier reducing its own price does not change the L1 identity. A rejected quote never causes an extension or a bid-submission activity entry.

```text
nextCloseTime = min(currentCloseTime + Y minutes, forcedCloseTime)
```

Y is added to the current close time, rather than to the bid submission time. Repeated qualifying bids can cause repeated extensions; each uses the latest committed deadline. An extension activity is recorded only when the close time actually increases.

For example, with a current close of 18:00, X = 10, Y = 5, and forced close at 18:12:

- A qualifying bid at 17:55 moves the close to 18:05.
- Another qualifying bid at 18:01 moves it to 18:10.
- Another qualifying bid at 18:08 moves it to 18:12.
- A bid at 18:12 is rejected.

## Status

| Status | Meaning |
| --- | --- |
| Upcoming | Start time has not arrived |
| Active | Start time has arrived and the effective deadline has not passed |
| Closed | The auction ended at a deadline earlier than forced close |
| Force Closed | The auction ended at the forced close time |

Upcoming is an additional display state for scheduled RFQs. Reaching the forced-close timestamp later does not change an auction that already closed normally into Force Closed. No manual close action is included in the initial scope.

## Activity history

Record accepted bid submissions, actual time extensions, and auction closure. An extension entry includes its trigger reason, associated bid, previous close time, new close time, and timestamp. A bid and all resulting auction changes are saved in one transaction.

Closure is recorded once per RFQ, in the same transaction as `closedAt` and `closeReason`. The closer rechecks the current deadline after acquiring the RFQ lock. Normal closure remains normal even if the forced-close timestamp has since passed; forced closure requires the auction deadline to have reached the forced-close cap.

Startup closes overdue RFQs before serving requests. Periodic checks repeat after a one-second pause between passes. Bid acceptance and read-time status calculation enforce deadlines independently of these checks. Closure time records when the server persisted the event, rather than changing the original deadline.

Current rankings are returned in ascending price order. Bid history and activity history are returned newest first, using record ID to break equal timestamps. Bid history includes current quotes and all previous accepted revisions.
