# Quotations Module — API Reference

Base path: `/api/quotations`

All routes require authentication.

---

## Status Lifecycle

```
Draft ──submit──▶ Pending ──approve──▶ Approved
                      └──deny────▶ Denied
```

- **Draft**: Can be created, updated, and deleted by sales/admin.
- **Pending**: Submitted for approval. Read-only. Can be approved or denied.
- **Approved**: Final state. Read-only.
- **Denied**: Final state. Includes reason. Read-only.

---

## `GET /api/quotations`

List quotations with pagination and filtering.

**Access:** Authenticated users  
**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `perPage` | int | 20 | Items per page (max 100) |
| `status` | string | — | Filter: Draft, Pending, Approved, Denied |
| `search` | string | — | Search quotation number or customer name |
| `customerName` | string | — | Filter by customer name (ilike) |
| `sortBy` | string | `created_at` | `created_at`, `updated_at`, `customer_name`, `total`, `status`, `quotation_number` |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Response:**
```json
{
  "data": [{ "id", "quotationNumber", "version", "customerName", "total", "status", ... }],
  "meta": { "total": 50, "page": 1, "perPage": 20, "totalPages": 3 }
}
```

---

## `GET /api/quotations/:id`

Get full quotation detail with spec values and custom items.

**Access:** Authenticated users  
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "quotationNumber": "JP/2026/000001",
    "version": 1,
    "customerName": "Sharma Fabricators",
    "customerDetails": { "gst": "27AABCU1234D1Z1" },
    "productKey": "trailer",
    "templateKey": "flatbed",
    "capacity": "40 Ton",
    "dimensions": { "length": "40 Feet" },
    "total": 850000,
    "manualTotal": null,
    "gstRate": 18,
    "orderQty": 1,
    "status": "Draft",
    "terms": ["...terms..."],
    "scopeOfWork": "Fabrication of...",
    "bankDetails": { "bankName": "ICICI" },
    "notes": null,
    "approvedBy": null,
    "approvedAt": null,
    "deniedBy": null,
    "deniedAt": null,
    "deniedReason": null,
    "createdBy": "uuid",
    "createdAt": "2026-07-30T10:00:00Z",
    "updatedAt": "2026-07-30T10:00:00Z",
    "specValues": [
      {
        "id": "uuid",
        "specKey": "deck_length",
        "specName": "Deck Length",
        "section": "Body",
        "selectedValue": "32 Feet",
        "customDescription": null,
        "customPrice": null,
        "isNotRequired": false,
        "effectivePriceDiff": 0
      }
    ],
    "customItems": [
      {
        "id": "uuid",
        "name": "Extra LED Lighting",
        "description": "Additional LED strip lighting",
        "quantity": 2,
        "price": 5000,
        "sortOrder": 0,
        "createdAt": "2026-07-30T10:00:00Z"
      }
    ]
  }
}
```

---

## `POST /api/quotations`

Create a new quotation. Pricing is calculated automatically from the template base price + spec diffs + custom items, unless `manualTotal` is provided.

**Access:** Authenticated users (sales/admin)

**Body:**
```json
{
  "customerId": "uuid (optional)",
  "customerName": "Sharma Fabricators",
  "customerDetails": { "gst": "27AABCU1234D1Z1" },
  "productKey": "trailer",
  "templateKey": "flatbed",
  "capacity": "40 Ton",
  "dimensions": { "length": "40 Feet" },
  "manualTotal": null,
  "gstRate": 18,
  "orderQty": 1,
  "terms": ["Validity 15 days"],
  "scopeOfWork": "Fabrication of flat bed trailer",
  "bankDetails": { "bankName": "ICICI" },
  "notes": null,
  "specValues": [
    { "specKey": "deck_length", "selectedValue": "32 Feet" },
    { "specKey": "axle_config", "customDescription": "Custom axle", "customPrice": 50000 }
  ],
  "customItems": [
    { "name": "Extra LED Lighting", "description": "LED strip", "quantity": 2, "price": 5000 }
  ]
}
```

**Pricing calculation:**
- `specTotal` = template.base_price + sum(specValue.effectivePriceDiff or customPrice)
- `customItemsTotal` = sum(customItem.price * customItem.quantity)
- `total` = (specTotal + customItemsTotal) * orderQty
- `manualTotal` overrides the calculated total entirely

---

## `PUT /api/quotations/:id`

Update a draft quotation. Automatically increments `version`.

**Access:** Admin, Sales  
**Constraints:** Only works on `Draft` quotations.

---

## `DELETE /api/quotations/:id`

Soft-delete a draft quotation.

**Access:** Admin, Sales  
**Constraints:** Only works on `Draft` quotations.

---

## `PATCH /api/quotations/:id/submit`

Submit a draft quotation for approval. Transitions `Draft → Pending`.

**Access:** Admin, Sales

---

## `PATCH /api/quotations/:id/approve`

Approve a pending quotation. Transitions `Pending → Approved`.

**Access:** Admin, Manager  
**Body:** `{ "comment": "Looks good" }` (optional)

---

## `PATCH /api/quotations/:id/deny`

Deny a pending quotation. Transitions `Pending → Denied`.

**Access:** Admin, Manager  
**Body:** `{ "reason": "Specifications need revision" }` (required)

---

## Data Model

```
quotations
  ├── quotation_spec_values  (selected options / custom specs)
  └── quotation_custom_items (ad-hoc line items)
```

- `quotation_spec_values` and `quotation_custom_items` are replaced atomically on update.
- Audit logs are written for every mutation.
- Version increments on every update.
