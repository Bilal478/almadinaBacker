# Bakery Admart POS — Backend

Laravel 12 + MySQL 8 + Sanctum. Built specifically around the existing Bakery Admart POS
frontend — every endpoint exists because a real screen/action needs it (see
[`docs/frontend-api-mapping.md`](docs/frontend-api-mapping.md) for the full mapping).

## 1. Requirements

- PHP 8.2+ (this machine has 8.1–8.2 available under `wamp64/bin/php/`)
- MySQL 8 (WampServer's bundled MySQL works)
- Composer 2

## 2. Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` — defaults already match a stock WAMP install (`root` / no password):

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bakery_admart
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://localhost:5173
```

Create the database, then migrate and seed:

```bash
mysql -u root -e "CREATE DATABASE bakery_admart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate --seed
```

`--seed` loads the exact demo dataset the frontend has always shipped with: the same 13
products, the same Premium Biscuits price-history/batch scenario, the same ~30 historical
sales — reconstructed as real transactions through `PurchaseService`/`SaleService` (not
raw SQL inserts), so FIFO batch depletion is a genuine consequence of real sales, not a
hand-typed number.

### Run it

```bash
php artisan serve --port=8000
```

API base: `http://localhost:8000/api`. (For production, point your web server's document
root at `public/`, the standard Laravel deployment — `artisan serve` is for local dev only.)

## 3. Demo login

Every seeded user shares the password **`password123`**:
`bilal.admin` (Administrator), `ayesha.manager` (Store Manager), `hamza.counter` /
`sana.counter` (Counter/Cashier).

## 4. Authentication

**Sanctum personal access tokens** (`Authorization: Bearer <token>`), not cookies/SPA mode
— simplest fit for a desktop-style POS client that isn't served from the same origin.

```
POST /api/auth/login          { username, password }  →  { user, token }
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

Every other route requires `auth:sanctum` plus the specific permission key listed in
`app/Support/Permissions.php` (mirrors the frontend's `PermissionKey` type). A 403 always
carries `"code": "UNAUTHORIZED"` and names which permission was required, in the exception,
not left to the frontend to guess.

## 5. Architecture

```
app/
  Http/Controllers/Api/   Thin — validate via Form Request, call a Service, return a Resource
  Http/Requests/          One per write endpoint
  Http/Resources/         Shape responses; ProductResource/SaleResource hide cost/profit
                           fields entirely server-side when the caller lacks view_purchase_cost
  Models/                 Eloquent models + relationships
  Services/
    Inventory/            InventoryService — the ONLY place stock is created, consumed
                           (FIFO, row-locked), or adjusted. Every change logs an
                           inventory_movements row.
    Products/              ProductPriceService — the ONLY place a price is recorded
                           (always INSERT, never UPDATE)
    Purchases/             PurchaseService, PurchaseReturnService
    Sales/                 SaleService, SaleReturnService
    Suppliers/              SupplierLedgerService, SupplierPaymentService
    Reports/, Dashboard/    Read-only aggregation over the above
  Support/Permissions.php  The fixed permission vocabulary, also seeded + registered as Gates
```

## 6. What's actually correct here (not just "connected")

- **Prices are append-only.** `POST /products/{id}/price-history` always inserts; a
  product's cached `current_*` price columns exist only for fast reads, never as the
  source of truth for a historical sale.
- **A sale snapshots the price effective on ITS OWN date** (`SaleService::priceAsOf`), not
  "today's price" — verified by `HistoricalPricingFifoTest`: a February sale keeps its
  January price/cost/profit forever, even after a September repurchase and reprice.
- **FIFO under row locks.** `InventoryService::consumeFifo` locks a product's batches
  (`lockForUpdate`) and consumes oldest-purchase-date-first inside a transaction — two
  counters can't both sell the last unit.
- **InnoDB is forced explicitly** (`config/database.php`), not left to the server default —
  this MySQL install's configured default engine is MyISAM, which silently no-ops
  `DB::transaction()`/rollback. Caught via a failed-sale-leaves-no-row test during
  development; every table in this schema is InnoDB.
- **Insufficient stock rejects the whole sale** rather than overselling or falling back to
  an estimated cost.
- **Totals are always recomputed server-side** (purchase totals, sale totals) — a
  tampered or buggy client can't record a total that doesn't match its own line items.
- **Void/returns reverse the exact batches involved**, recorded via `sale_item_batches` at
  sale time — not a guess at "whichever batch has room now".
- **Nothing financial is hard-deleted.** Expenses are voided, not deleted; sales/purchases/
  payments have no delete route at all — corrections are returns/adjustments, which is how
  a real ledger works.

## 7. Testing

```bash
php artisan test
```

28 Pest feature tests, covering: login/permission enforcement, cost-field hiding by role,
purchase → batch → payable → partial payment → ledger balance, product creation with
opening stock, append-only price history, **the full historical-pricing/FIFO scenario from
the spec (Jan purchase → Feb sale → Sep repurchase+reprice → Oct sale → Feb sale
re-verified unchanged)**, weighted-average cost across two batches, insufficient-stock
rejection, void-restocks-exact-batches, partial sale returns (and over-return rejection),
purchase returns (ledger credit, original purchase untouched), low-stock/expiring reports,
manual stock adjustments, audit logging, and role/user management.

## 8. API documentation

Auto-generated from the actual route/Resource code via [Scramble](https://scramble.dedoc.co) —
no annotations to keep in sync by hand:

```
http://localhost:8000/docs/api        interactive UI
http://localhost:8000/docs/api.json   OpenAPI spec
```

## 9. Known scope boundaries (intentionally not built)

- **Held sales stay client-side.** A transient "still deciding" cart state — persisting it
  server-side is a reasonable future addition, not built here.
- **No cash-drawer/shift reconciliation.** Flagged separately as the largest remaining gap
  for real day-to-day use; a distinct, larger feature from what this pass covers.
- **Purchases are "record = receive" in one step**, not a separate PO-then-receive
  workflow — matches how this bakery actually buys from local suppliers day-to-day.
