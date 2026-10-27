# Deploy on Vercel

Import `darshilvatyani/british-auction-rfq` as one Vercel project, using the repository root (`./`). The root `vercel.json` defines the frontend, API, routing, and auction-closing worker. There is no Render service in this setup.

| Part | Runtime |
| --- | --- |
| React frontend | Vite static service named `web` |
| Express API | Node.js service named `api`, exported from `server/src/vercel.js` |
| Automatic closing | Vercel daemon running `server/src/worker.js` |
| PostgreSQL | Neon integration from the Vercel Marketplace |

Services and Daemons currently use Vercel's beta deployment features. Daemons run in production, not preview deployments. A preview can display deadline-based statuses and reject late bids, but it does not run its own closing worker. Use the production deployment to verify persisted automatic closure.

## Before importing

1. Commit and push the deployment changes to GitHub.
2. Sign in to Vercel and choose **Add New > Project**.
3. Import `darshilvatyani/british-auction-rfq`.
4. Keep **Root Directory** as `./` and use Node.js 24. Let the services in `vercel.json` control their install, build, and output settings. Do not set the project root to `client` or `server`.

## Connect PostgreSQL

Create a Neon Postgres database through Vercel's **Storage / Marketplace** interface and connect it to this project. Prefer the same region as the API and closing worker; the configuration uses `iad1` (US East / Washington, D.C.). Choose an appropriate plan in the dashboard before provisioning.

Set `DATABASE_URL` in the project's Production environment to Neon's pooled PostgreSQL connection URL, retaining its SSL parameters. The Neon integration may add this variable automatically. If it adds a different variable name, add `DATABASE_URL` using the supplied pooled connection string in Vercel's environment-variable editor.

Keep the database URL in Vercel's server environment. Do not put it in Git, `vercel.json`, or a `VITE_` variable. A localhost connection string will not work in a cloud deployment. Configure an isolated database for Preview if you enable preview builds; do not point those builds at the production database.

No frontend API URL is needed: browser requests use `/api` on the same domain. `CLIENT_ORIGIN` is optional for this deployment because browser requests are same-origin; if set, use the exact public site origin, without a trailing slash. The local default remains `http://localhost:5173`.

If the initial deployment started before the database was connected, it may fail during migrations. Add the database environment variable and redeploy.

## Build and startup

The frontend service runs `npm run build` from `client`. The API service runs migrations and the idempotent seed command from `server` before deployment. Failed migrations stop the build. Successful redeployments preserve existing RFQs, bids, and deadlines; seeding does not reset the two samples.

The Express entry exports the app without opening a listening port or starting a background timer inside a request function. Vercel manages HTTP requests. Its database helper releases idle pool connections when the function suspends.

The `auction-closer` daemon is packaged by `server/Dockerfile.closer`. It runs one worker in `iad1`. The worker reconciles expired auctions at startup, checks again one second after each completed pass, and stops cleanly on SIGTERM. Its timer remains referenced so the worker stays running even when its database connections are idle. Bids still check deadlines inside the locked transaction independently of this worker.

Production browser builds refetch every two seconds while the page is visible, and on window focus and deadline changes. A slow request is allowed to finish rather than being canceled by every refresh. The UI shows **Auto-refresh on**. Development mode retains Socket.IO. This avoids using process-local socket rooms as a cross-instance notification channel on Vercel.

Keep an eye on Vercel and Neon usage quotas: the worker queries regularly even when nobody is viewing the application. No paid plan is required by these configuration files, but the plans and quotas selected in your dashboards apply.

## Verify the live deployment

1. Open `/api/health` and confirm a JSON response.
2. Open `/api/suppliers` and confirm the three seeded suppliers.
3. Open `/rfqs/new` directly, then reload it. The frontend rewrite should preserve client routing.
4. Create a fresh active British RFQ. The sample deadlines are relative to their first seed time and may already be expired.
5. Submit quotes from two suppliers. Confirm ranks, lower-own-price validation, and the selected extension rule.
6. Open the same RFQ in another tab and confirm prices and activity update after a refresh cycle.
7. Let a short auction expire without interacting with it. In Vercel's daemon logs, confirm **Auction closing worker started.** Reopen its activity log and verify exactly one closure entry and the expected normal/forced reason.

## Common deployment problems

| Problem | Check |
| --- | --- |
| Build cannot find `DATABASE_URL` | Connect Neon and make the variable available to Production builds and runtime; redeploy |
| API returns the frontend HTML | Use the repository root and the `/api` service rewrite from `vercel.json` |
| Direct page URL returns 404 | Keep the frontend service's rewrite to `/index.html` |
| Auction status is closed but closure activity is absent | Check the production daemon's deployment state, logs, quota, and database access |
| Worker repeatedly exits | Check its startup error and confirm it uses the referenced timer via `startAuctionCloser(1000, true)` |
| Connection refused / SSL failure | Use the cloud database URL with the provider's SSL parameters, not the local example URL |

References: [Vercel Services](https://vercel.com/docs/services), [Daemons](https://vercel.com/docs/daemons), [Postgres integrations](https://vercel.com/docs/postgres), and [database pool management](https://vercel.com/kb/guide/connection-pooling-with-functions).
