# Products Module — API Reference

Base path: `/api/products`

All routes require authentication.

---

## Products

### `GET /api/products`
List all product categories.

**Access:** Authenticated users  
**Response:** `{ data: Product[] }`

### `GET /api/products/:key`
Get a single product by its key.

**Access:** Authenticated users  
**Response:** `{ data: Product }`

### `GET /api/products/:key/templates`
Get a product with its templates (no spec details).

**Access:** Authenticated users  
**Response:** `{ data: ProductWithTemplates }`

### `POST /api/products`
Create a new product category.

**Access:** Admin only  
**Body:**
```json
{ "key": "fabrication", "name": "Fabrication", "description": "...", "sortOrder": 1 }
```

### `PUT /api/products/:key`
Update a product category.

**Access:** Admin only  

---

## Templates

### `GET /api/products/:key/templates/:templateKey`
Get template details with all specs and options (full tree).

**Access:** Authenticated users  
**Response:**
```json
{
  "data": {
    "id": "...",
    "productId": "...",
    "key": "flatbed",
    "name": "Flat Bed Trailer",
    "basePrice": 850000,
    "dimensions": { "length": "40 Feet" },
    "sortOrder": 1,
    "isActive": true,
    "specs": [
      {
        "id": "...",
        "templateId": "...",
        "specKey": "deck_length",
        "name": "Deck Length",
        "section": "Body",
        "specType": "dropdown",
        "defaultValue": null,
        "options": [
          { "id": "...", "optionName": "32 Feet", "priceDiff": 0, "isDefault": true }
        ]
      }
    ]
  }
}
```

### `POST /api/products/:key/templates`
Create a template. Admin only.

### `PUT /api/products/:key/templates/:templateKey`
Update a template. Admin only.

### `DELETE /api/products/:key/templates/:templateKey`
Delete a template (cascades to specs + options). Admin only.

---

## Specs (under template ID)

### `GET /api/products/templates/:id/specs`
List specs with their options for a template.

**Access:** Authenticated users  

### `GET /api/products/templates/:id/specs/:specKey`
Get a single spec with options.

### `POST /api/products/templates/:id/specs`
Create a spec (optionally with options). Admin only.

**Body:**
```json
{
  "specKey": "axle_config",
  "name": "Axle Configuration",
  "section": "Chassis",
  "specType": "dropdown",
  "options": [
    { "optionName": "2 Axle", "priceDiff": -50000 },
    { "optionName": "3 Axle", "priceDiff": 80000, "isDefault": true }
  ]
}
```

### `PUT /api/products/templates/:id/specs/:specKey`
Update a spec. Admin only.

### `DELETE /api/products/templates/:id/specs/:specKey`
Delete a spec (cascades to options). Admin only.

---

## Options (under spec ID)

### `POST /api/products/specs/:specId/options`
Create an option. Admin only.

**Body:** `{ "optionName": "4 Axle", "priceDiff": 120000, "isDefault": false }`

### `PUT /api/products/specs/:specId/options/:optionId`
Update an option. Admin only.

### `DELETE /api/products/specs/:specId/options/:optionId`
Delete an option. Admin only.

---

## Data Model

```
products (categories)
  └── product_templates (e.g., Flat Bed Trailer)
       └── product_template_specs (e.g., Deck Length, Axle Config)
            └── product_spec_options (e.g., "32 Feet", "3 Axle")
```

- Products, templates, specs, and options are **read-only** for non-admin users.
- Only **admin** role can create, update, or delete.
- Deleting a template cascades to its specs and options.
- Deleting a spec cascades to its options.
