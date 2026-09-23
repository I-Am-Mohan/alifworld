# S3-Compatible Product Image and Video Handling

Milestone 085 adds private S3-compatible product media handling for seller-owned products.

## Contract

- Product media is uploaded through authenticated seller-scoped multipart routes.
- Supported images are JPEG, PNG, WebP, and AVIF up to 10 MB.
- Supported videos are MP4, WebM, and QuickTime up to 100 MB.
- Media objects are stored under seller/product-scoped private object keys with server-side encryption.
- Product media metadata stores the private object key, MIME type, size, alt text, primary flag, and display order.
- Read access returns short-lived signed URLs after ownership checks; clients never receive storage credentials or unrestricted object keys.
- Deletion is soft-delete aware and audited.

## API

- `GET/POST /api/v1/seller/catalog/products/{id}/media`
- `GET/DELETE /api/v1/seller/catalog/products/{id}/media/{mediaId}`

## Integrity

The media service enforces seller ownership, product media count limits, MIME/size policy, primary-media behavior, and audit events. Permanent files are never written to the application filesystem.
