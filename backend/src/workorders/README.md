# Work Orders Module — API Reference

Base path: `/api/work-orders`

All routes require authentication.

---

## `GET /api/work-orders`

List work orders with pagination and filtering.

**Access:** Authenticated users  
**Query params:** `status`, `search`, `urgent`, `sortBy`, `sortOrder`, `page`, `perPage`

**Response:** Paginated list of work order summaries.

---

## `GET /api/work-orders/:id`

Get full work order detail with production items.

**Access:** Authenticated users  

---

## `POST /api/work-orders`

Create a work order from an approved quotation.

**Access:** Admin, Manager, Sales  
**Body:** `{ "quotationId": "uuid", "factoryNotes": "...", "dueDate": "2026-09-01", "isUrgent": false }`

Creates one production item per `order_qty` with initial `Pending` stage record.

---

## `PUT /api/work-orders/:id`

Update an open work order.

**Access:** Admin, Manager  
**Constraints:** Only `Open` status work orders can be modified.

---

## `DELETE /api/work-orders/:id`

Soft-delete an open work order.

**Access:** Admin  
**Constraints:** Only `Open` status.

---

## `PATCH /api/work-orders/:id/due-date`

Set or clear the due date.

**Access:** Admin, Manager  
**Body:** `{ "dueDate": "2026-09-01" }` or `{ "dueDate": null }`

---

## `PATCH /api/work-orders/:id/urgent`

Toggle the urgent flag.

**Access:** Admin, Manager  

---

## Statuses

- `Open` — Active work order, can be updated
- Other statuses set manually (e.g., `In Progress`, `Completed`, `On Hold`)
