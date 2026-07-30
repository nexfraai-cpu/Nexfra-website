# Uploads Module (`/api/uploads`)

File storage and management using Supabase Storage. Supports quotation PDFs, private attachments, and public company assets with role-based access, signed URLs, and audit logging.

---

## Storage Buckets

| Bucket | Visibility | Max Size | Allowed Types | Purpose |
|--------|-----------|----------|---------------|---------|
| `quotation-pdfs` | Public | 10 MB | PDF | Generated quotation PDFs |
| `attachments` | Private | 50 MB | PNG, JPEG, WebP, PDF, DOC, DOCX | Private file attachments |
| `company-assets` | Public | 20 MB | PNG, JPEG, SVG, WebP, PDF | Logos, brand assets, templates |

---

## Endpoints

### Quotation PDFs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/uploads/quotations/:id/pdf` | admin, sales | Upload PDF for a quotation |
| GET | `/api/uploads/quotations/:id/pdf` | admin, finance, manager, sales | Get signed URL for quotation PDF |

**Upload** (multipart/form-data):
```
file: <binary PDF>
```

**Response** (POST):
```json
{
  "data": {
    "path": "quotations/q-1111-xxxx.pdf",
    "url": "https://xxxx.supabase.co/storage/v1/object/public/quotation-pdfs/quotations/q-1111-xxxx.pdf",
    "bucket": "quotation-pdfs",
    "size": 102400,
    "mimeType": "application/pdf"
  }
}
```

### Attachments (Private)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/uploads/attachments` | all authenticated | Upload private attachment |

Files are stored under `attachments/{userId}/{uuid}.{ext}`.

**Upload** (multipart/form-data):
```
file: <binary>
```

**Response:**
```json
{
  "data": {
    "path": "attachments/actor-uuid/some-uuid.pdf",
    "bucket": "attachments",
    "size": 204800,
    "mimeType": "image/png"
  }
}
```

### Company Assets (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/uploads/assets` | admin | Upload brand asset (logo, template) |

**Upload** (multipart/form-data):
```
file: <binary>
category: logos          (optional — subfolder within bucket)
```

### Signed URLs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/uploads/signed/:bucket/*path` | admin, finance, manager, sales | Get temporary signed URL for private file |

**Query params:** `expiresIn` (seconds, default 3600, min 60, max 86400)

**Response:**
```json
{
  "data": {
    "signedUrl": "https://xxxx.supabase.co/storage/v1/object/sign/attachments/...",
    "path": "attachments/actor/file.pdf",
    "bucket": "attachments",
    "expiresIn": 3600
  }
}
```

### File Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| DELETE | `/api/uploads/:bucket/*path` | admin | Delete a file |
| GET | `/api/uploads/list/:bucket` | admin | List files in a bucket |

**List query params:** `folder` (subfolder to list within bucket)

---

## Architecture

```
Controller (Express handlers)
  └── Service (business logic + audit logging)
       └── StorageService (Supabase Storage wrapper)
            └── supabase.storage.from(bucket)
```

- **Multer** handles multipart/form-data parsing with memory storage
- **Per-bucket validation**: MIME types and size limits match the Supabase Storage bucket configuration
- **Audit logging**: All uploads and deletes are recorded in `audit_logs`
- **Public URLs**: `quotation-pdfs` and `company-assets` use `getPublicUrl()` for direct access
- **Signed URLs**: `attachments` uses `createSignedUrl()` with configurable expiry

## Roles

| Role | Quotation PDFs | Attachments | Assets | Signed URLs | Delete |
|------|---------------|-------------|--------|-------------|--------|
| admin | CR | CR | C | R | D |
| sales | CR | CR | — | R | — |
| manager | R | CR | — | R | — |
| finance | R | CR | — | R | — |
