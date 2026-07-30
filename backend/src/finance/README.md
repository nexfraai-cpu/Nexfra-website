# Finance Module (`/api/finance`)

Full financial management: invoicing, payments, ledger, transactions, outstanding balances, and audit logs.

---

## Endpoints

### Sales (Invoices)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/finance/sales` | admin, finance, manager | List sales (paginated, filterable) |
| GET | `/api/finance/sales/:id` | admin, finance, manager | Get sale detail with payment history |
| POST | `/api/finance/sales` | admin, finance | Create invoice (auto-generates INV-xxxxxx) |
| PUT | `/api/finance/sales/:id` | admin, finance | Update invoice |
| DELETE | `/api/finance/sales/:id` | admin | Soft-delete invoice |

**Query params** (list): `status`, `search`, `sortBy`, `sortOrder`, `page`, `perPage`

**Create body:**
```json
{
  "customerName": "Tata Logistics",
  "productName": "Flat Bed Trailer",
  "amount": 850000,
  "invoiceNumber": "INV-CUSTOM-001",
  "deliveryDate": "2026-09-15",
  "notes": "Payment within 30 days"
}
```

**Response** (single):
```json
{
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-000001",
    "customerName": "Tata Logistics",
    "productName": "Flat Bed Trailer",
    "amount": 850000,
    "paidAmount": 425000,
    "outstanding": 425000,
    "status": "Partial",
    "payments": [
      { "id": "uuid", "paymentNumber": "PAY-000001", "amount": 425000, "mode": "RTGS", "paymentDate": "2026-08-01" }
    ],
    "createdAt": "2026-07-30T10:00:00Z",
    "updatedAt": "2026-08-01T12:00:00Z"
  }
}
```

---

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/finance/payments` | admin, finance, manager | List payments (paginated, filterable) |
| GET | `/api/finance/payments/:id` | admin, finance, manager | Get payment detail |
| POST | `/api/finance/payments` | admin, finance | Record payment (auto-updates sale status) |
| PUT | `/api/finance/payments/:id` | admin, finance | Update payment (recalculates status) |
| DELETE | `/api/finance/payments/:id` | admin | Soft-delete payment (recalculates status) |

**Payment modes:** `Cash`, `RTGS`, `Cheque`, `UPI`, `Card`, `Other`

**Query params** (list): `saleId`, `mode`, `startDate`, `endDate`, `sortBy`, `sortOrder`, `page`, `perPage`

**Create body:**
```json
{
  "saleId": "uuid",
  "amount": 425000,
  "mode": "RTGS",
  "reference": "RTGS-12345",
  "paymentDate": "2026-08-01",
  "notes": "Advance payment"
}
```

**Sale status transitions:** `Pending` → `Partial` → `Paid` (automatic based on total paid vs. amount)

---

### Ledger

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/finance/ledger` | admin, finance, manager | Unified sales + payments ledger with running balance |

**Query params:** `startDate`, `endDate`, `customerName`, `page`, `perPage`

The ledger combines sales (debits) and payments (credits) chronologically with running balances:

```json
{
  "data": [
    { "id": "uuid", "date": "2026-07-30", "type": "sale", "reference": "INV-000001", "customerName": "Tata Logistics", "productName": "Flat Bed Trailer", "debit": 850000, "credit": 0, "balance": 850000 },
    { "id": "uuid", "date": "2026-08-01", "type": "payment", "reference": "PAY-000001", "customerName": "Tata Logistics", "productName": "Flat Bed Trailer", "debit": 0, "credit": 425000, "balance": 425000 }
  ],
  "meta": { "total": 2, "page": 1, "perPage": 20, "totalPages": 1 }
}
```

---

### Transactions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/finance/transactions` | admin, finance, manager | Unified transaction history |

**Query params:** `type` (Sale|Payment), `startDate`, `endDate`, `customerName`, `page`, `perPage`

```json
{
  "data": [
    { "id": "uuid", "date": "2026-07-30", "type": "Sale", "referenceNumber": "INV-000001", "customerName": "Tata Logistics", "productName": "Flat Bed Trailer", "amount": 850000, "status": "Pending" },
    { "id": "uuid", "date": "2026-08-01", "type": "Payment", "referenceNumber": "PAY-000001", "customerName": "Tata Logistics", "productName": "Flat Bed Trailer", "amount": 425000, "mode": "RTGS" }
  ]
}
```

---

### Audit Logs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/finance/audit-logs` | admin, finance | Finance entity audit trail |

**Query params:** `entityType` (sale|payment), `entityId`, `action`, `page`, `perPage`

```json
{
  "data": [
    { "id": "uuid", "employeeId": "uuid", "employeeName": "Admin User", "action": "create", "entityType": "sale", "entityId": "uuid", "description": "create sale", "metadata": {}, "createdAt": "2026-07-30T10:00:00Z" }
  ]
}
```

---

### Stats & Outstanding

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/finance/stats/monthly` | admin, finance, manager | Monthly revenue summary (last 12 months) |
| GET | `/api/finance/stats/outstanding` | admin, finance, manager | Top 50 customer outstanding balances |

---

## Database Tables

- **`sales`** — Invoice records with `invoice_number`, `customer_name`, `amount`, `status`
- **`payments`** — Payment records linked to sales via `sale_id`
- **`audit_logs`** — Read-only audit trail for finance entity changes
- **`v_monthly_revenue`** — View: monthly payment aggregations
- **`v_customer_outstanding`** — View: per-customer outstanding (sales - payments)
- **`recalculate_customer_outstanding`** — PL/pgSQL function to refresh denormalized `customers.outstanding`

## Roles

| Role | Sales | Payments | Ledger | Transactions | Audit Logs | Stats |
|------|-------|----------|--------|--------------|------------|-------|
| admin | CRUD | CRUD | R | R | R | R |
| finance | CRUD | CRUD | R | R | R | R |
| manager | R | R | R | R | — | R |
| sales | — | — | — | — | — | — |
