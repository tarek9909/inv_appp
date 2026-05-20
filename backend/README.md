# Stock Driver System Backend

Express MVC backend for inventory, purchase orders, drivers, stock deduction/return requests, payments, audit logs, and reports.

## Setup

1. Copy `.env.example` to `.env` and update the MySQL credentials.
2. Create the MySQL database:

```sql
CREATE DATABASE stock_driver_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Install dependencies and prepare the database:

```bash
npm install
npm run seed
npm run dev
```

The API runs at `http://localhost:3000`.
Swagger docs are available at `http://localhost:3000/api-docs`.
Pending migrations run automatically when the backend starts. Set `DB_AUTO_MIGRATE=false` only if you want to manage migrations manually with `npm run migrate`.

## Production Environment

For Render + MySQLFreeDatabase, set these variables on the backend service:

- `NODE_ENV=production`
- `TRUST_PROXY=true`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_SSL=false` unless your MySQL provider requires SSL
- `DB_AUTO_MIGRATE=true`
- `JWT_SECRET`
- `CORS_ORIGIN=https://your-frontend.onrender.com`

## Seed Logins

All seeded users use password `password123`.

- `admin@example.com`
- `inventory@example.com`
- `accountant@example.com`

## Main API Areas

- `POST /api/v1/auth/login`
- Admin: `/api/v1/users`, `/api/v1/roles`, `/api/v1/audit-logs`
- Inventory: `/api/v1/categories`, `/api/v1/suppliers`, `/api/v1/items`, `/api/v1/stock-entries`, `/api/v1/stock-adjustments`, `/api/v1/stock-movements`, `/api/v1/purchase-orders`
- Accountant: `/api/v1/drivers`, `/api/v1/stock-requests`, `/api/v1/payments`
- Reports: `/api/v1/reports/dashboard`

## Important Business Rules

- `items.current_stock` should be changed only through stock entries, stock adjustments, purchase receiving, or completed driver stock requests.
- Completing `stock_out` requests deducts stock.
- Completing `stock_return` requests adds stock.
- Payments update paid amount, remaining amount, and payment status.
- Archive/restore uses status changes. Admin-only permanent deletes are allowed only for unreferenced master data.
- Important create/update/complete/cancel/payment actions write audit logs.
