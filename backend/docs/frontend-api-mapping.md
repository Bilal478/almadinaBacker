# Frontend ↔ API Mapping

Every frontend screen in `src/pages` / `src/components`, and the endpoint it talks to.
All endpoints require `Authorization: Bearer <token>` except login. All responses are
`{ success, message?, data }` on success or `{ success: false, message, code, errors }`
on failure.

---

## Login (`src/pages/Login.tsx`)

| Action | API | Permission |
|---|---|---|
| Sign in | `POST /api/auth/login` `{ username, password }` → `{ user, token }` | none |
| Restore session on refresh | `GET /api/auth/me` | any valid token |
| Logout | `POST /api/auth/logout` | any |

---

## POS / Sales screen (`src/pages/pos/PosPage.tsx`)

| Action | API | Permission |
|---|---|---|
| Product search (name/SKU/barcode) | `GET /api/pos/products/search?q=` | `view_pos` |
| Scan barcode | `GET /api/pos/products/barcode/{barcode}` | `view_pos` |
| Complete sale | `POST /api/sales` `{ items[{product_id,quantity,discount}], price_tier, discount, customer_name, payment_method, amount_received }` | `create_sale` |
| Void a sale | `POST /api/sales/{sale}/void` | `void_sale` |
| Reprint / view a past sale | `GET /api/sales/{sale}` | `view_pos` |

The server determines `unit_price` from the product's **current** price for the requested
`price_tier` — it is never taken from the request body. Cost/profit fields
(`total_cost`, `gross_profit`, line `unit_cost`/`gross_profit`) are present in the response
only when the caller has `view_purchase_cost`; a Counter/Cashier token never receives them.

Held sales (F8 in the frontend) remain a client-side-only concept — no endpoint backs them
yet (see README §9).

---

## Products screen (`src/pages/Products.tsx` + `ProductFormModal`, `ProductDetailModal`)

| Action | API | Permission |
|---|---|---|
| List / filter products | `GET /api/products?category_id=&status=&per_page=` | `view_products` |
| View one | `GET /api/products/{product}` | `view_products` |
| Create (+ optional opening stock) | `POST /api/products` `{ name, sku, barcode, qr_code?, category_id?, unit_id, low_stock_alert_qty, expiry_controlled, purchase_cost, customer_price, retailer_price, opening_quantity?, opening_expiry_date? }` | `manage_products` |
| Update core fields (never price) | `PUT /api/products/{product}` | `manage_products` |
| Activate/deactivate | `PATCH /api/products/{product}/status` `{ status }` | `manage_products` |
| Price History tab — list | `GET /api/products/{product}/price-history` | `manage_products` |
| Price History tab — record change | `POST /api/products/{product}/price-history` `{ purchase_cost, customer_price, retailer_price, effective_from?, note? }` | `manage_products` |
| Batch/Stock History tab | `GET /api/products/{product}/stock` → `{ available_stock, batches[] }` | `view_products` |

`current_purchase_cost` is omitted from the JSON entirely (not just hidden in the UI) for
callers without `view_purchase_cost`.

---

## Units / Categories / Supplier Types (simple master-data CRUD screens)

| Screen | List | Create | Update | Status toggle |
|---|---|---|---|---|
| Units | `GET /api/units` | `POST /api/units` | `PUT /api/units/{unit}` | `PATCH /api/units/{unit}/status` |
| Categories | `GET /api/categories` | `POST /api/categories` | `PUT /api/categories/{category}` | `PATCH /api/categories/{category}/status` |
| Supplier Types | `GET /api/supplier-types` | `POST /api/supplier-types` | `PUT /api/supplier-types/{supplierType}` | `PATCH /api/supplier-types/{supplierType}/status` |

All gated behind `manage_products` (units/categories) or `manage_suppliers` (supplier types).

---

## Suppliers screen (`src/pages/Suppliers.tsx`)

| Action | API | Permission |
|---|---|---|
| List (with outstanding balance) | `GET /api/suppliers` — each row includes `outstanding` | `manage_suppliers` |
| Create / update / status | `POST /PUT/PATCH /api/suppliers[/{supplier}[/status]]` | `manage_suppliers` |
| Supplier detail (balance + recent activity in one call) | `GET /api/suppliers/{supplier}/summary` | `manage_suppliers` |

---

## Supplier Payments / Ledger screen (`src/pages/SupplierPayments.tsx`)

| Action | API | Permission |
|---|---|---|
| Ledger table (opening + purchases + payments + returns, running balance) | `GET /api/suppliers/{supplier}/ledger?from_date=&to_date=` (paginated) | `view_supplier_balances` |
| Record a payment | `POST /api/suppliers/{supplier}/payments` `{ amount, payment_date, reference?, description?, payment_method? }` | `manage_supplier_payments` |

The ledger is computed once at write time (`SupplierLedgerService`) and stored per-row —
the frontend renders it directly, no client-side balance math needed.

---

## Purchases screen (`src/pages/Purchases.tsx` + `PurchaseFormModal`, `ProductLineCombobox`)

| Action | API | Permission |
|---|---|---|
| List / view a purchase (with items + batches) | `GET /api/purchases`, `GET /api/purchases/{purchase}` | `manage_purchases` |
| Record purchase (creates batches + supplier payable in one call) | `POST /api/purchases` `{ supplier_id, purchase_date, reference?, invoice_no?, paid_amount?, items[{product_id,quantity,unit_id?,purchase_cost,batch_number?,expiry_date?}] }` | `manage_purchases` |
| "Add new product" inline from a purchase line | `POST /api/products` (same endpoint as the Products screen — the combobox's quick-add is not a special-case API) | `manage_products` |
| Purchase return | `POST /api/purchases/{purchase}/returns` `{ reason?, items[{batch_id,quantity}] }` | `manage_purchases` |

`total_amount`/`due_amount` are always recomputed from `items` server-side.

---

## Inventory screen (`src/pages/Inventory.tsx`) — currently read-only in the frontend; the API supports more

| Action | API | Permission |
|---|---|---|
| Batch list (current read-only screen) | `GET /api/inventory?product_id=` | `manage_inventory` |
| Per-product batches + stock | `GET /api/inventory/{product}` | `manage_inventory` |
| Movement history | `GET /api/inventory/movements?product_id=` | `manage_inventory` |
| Low stock | `GET /api/inventory/low-stock` | `manage_inventory` |
| Expired / expiring soon | `GET /api/inventory/expired`, `GET /api/inventory/expiring?days=` | `manage_inventory` |
| **New:** manual stock adjustment (wastage/damage/expiry/recount) | `POST /api/inventory/adjustment` `{ product_id, batch_id?, quantity, movement_type, reason }` | `manage_inventory` |

The adjustment endpoint has no frontend screen yet — it's the fix for the "Inventory page
is read-only despite the manage_inventory permission implying otherwise" gap from the
earlier audit. Wiring a small form to it is the natural next step.

---

## Expenses screen (`src/pages/Expenses.tsx`)

| Action | API | Permission |
|---|---|---|
| List / filter | `GET /api/expenses?date_from=&date_to=&category_id=` | `manage_expenses` |
| Categories | `GET /api/expense-categories`, `POST /api/expense-categories` | `manage_expenses` |
| Create / update | `POST/PUT /api/expenses` | `manage_expenses` |
| **Changed from the frontend's current behavior:** delete → void | `PATCH /api/expenses/{expense}/void` | `manage_expenses` |

The frontend's current "delete" button hard-deletes; expenses are financial history and
must never be hard-deleted (spec rule), so the frontend should call `void` instead and
show voided expenses as struck-through/excluded from totals rather than removing the row.

---

## Reports screen (`src/pages/Reports.tsx`)

All accept the same filter set where relevant: `date_from`, `date_to`, `supplier_id`,
`product_id`, `category_id`, `seller_id`, `payment_method`.

| Report tab | API |
|---|---|
| Sales Report | `GET /api/reports/sales` |
| Product Sales | `GET /api/reports/product-sales` |
| Seller Report | `GET /api/reports/sellers` |
| Supplier Report | `GET /api/reports/suppliers` |
| Purchase Report | `GET /api/reports/purchases` |
| Inventory Report | `GET /api/reports/inventory` |
| Expense Report | `GET /api/reports/expenses` |
| Profit Report (monthly Revenue/COGS/Gross/Expenses/Net) | `GET /api/reports/profit` |

All gated behind `view_reports`. Every figure derives from stored historical snapshots
(`sale_items.unit_cost`, `sale_items.unit_price`) — never recalculated from today's product
price.

---

## Users / Roles & Permissions screens (`src/pages/Users.tsx`, `Roles.tsx`)

| Action | API | Permission |
|---|---|---|
| List / create / update users | `GET/POST/PUT /api/users` | `manage_users` |
| Activate/deactivate | `PATCH /api/users/{user}/status` | `manage_users` |
| List roles (with permissions + user count) | `GET /api/roles` | any valid token (needed for the user-creation dropdown) |
| Create/update role permissions | `POST/PUT /api/roles` `{ name, description?, permissions: string[] }` | `manage_roles` |
| Delete role | `DELETE /api/roles/{role}` (blocked if system role or has users) | `manage_roles` |
| Full permission list (for the Permission Matrix component) | `GET /api/permissions` → grouped `{ "Point of Sale": [{key,label}], ... }` | any valid token |

New users created via the form get a default password of `password123` (matches the
seeded demo accounts) unless the frontend adds a password field.

---

## Dashboard (`src/pages/Dashboard.tsx`)

| Action | API |
|---|---|
| Everything the dashboard needs, in one call | `GET /api/dashboard/summary` → today's sales/purchases/expenses/gross+net profit, inventory value, low-stock/expired/expiring-soon counts, total supplier outstanding |

Gated behind `view_pos` (the least-restrictive permission every active user has), so every
role sees the dashboard — the frontend should still hide the financial tiles
(`today_gross_profit`, `today_net_profit`, `supplier_outstanding`) from a Counter/Cashier
in the UI, the same way it already does today.
