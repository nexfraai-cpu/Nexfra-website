# Production Module — API Reference

Base path: `/api/production`

All routes require authentication.

---

## Production Stages (ordered)

```
Pending → Material Ordered → Cutting → Fabrication → Welding
    → Painting → Assembly → QC → Ready → Delivered
```

Stage advancement can be:
- **Automatic**: advances to the next stage in the sequence
- **Specified**: provide `stageKey` to jump to any later stage

---

## `GET /api/production`

List production items with pagination and work order context.

**Access:** Authenticated users  
**Query params:** `stage`, `workOrderId`, `search`, `sortBy`, `sortOrder`, `page`, `perPage`

---

## `GET /api/production/:id`

Get full production item detail with stage records and chassis records.

**Access:** Authenticated users  

---

## `PUT /api/production/:id`

Update dispatch fields or stage progress.

**Access:** Admin, Manager  
**Body:** `{ "dispatchFields": { "driver": "Raj", "vehicle": "KA-01-1234" }, "stageProgress": { "Cutting": "50%" } }`

---

## `PATCH /api/production/:id/stage`

Advance the production stage.

**Access:** Admin, Manager  
**Body:** `{ "stageKey": "Fabrication" (optional, auto-advance if omitted), "remark": "Started fabrication" }`

- Automatically sets `started_at` on first stage change
- Automatically sets `completed_at` when stage reaches `Delivered`
- Upserts a `production_stage_record` for history

---

## `GET /api/production/:id/chassis`

Get chassis records linked to this item's work order.

**Access:** Authenticated users  

---

## `POST /api/production/:id/chassis`

Add a chassis record.

**Access:** Admin, Manager  
**Body:** `{ "field": "Truck", "brand": "Tata", "model": "LPT 3118", "chassisNumber": "TATA12345", "arrivalDate": "2026-08-01" }`

---

## `PUT /api/production/:id/chassis/:chassisId`

Update a chassis record.

**Access:** Admin, Manager  

---

## Data Model

```
work_orders
  └── production_items (one per unit)
        ├── production_stage_records (history of each stage)
        └── chassis_records (linked via work_order_id)
```

- `dispatch_fields` on production_items stores dispatch info (driver, vehicle, etc.)
- `stage_progress` on production_items tracks per-stage timestamps
- `remarks` on production_stage_records capture notes at each stage
