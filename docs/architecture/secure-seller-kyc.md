# Secure seller KYC document handling

## Storage contract

Seller KYC uploads use the S3-compatible object storage configured by `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, and `S3_FORCE_PATH_STYLE`. Objects are written under `private/kyc/{sellerId}/{documentId}/{documentType}` with AES-256 server-side encryption requested. The database stores this private object key in `SellerKycDocument.fileUrl`; it never stores a public URL.

The application server validates file size, declared MIME type, and magic-byte signature for PDF, JPEG, PNG, and WebP before storage. SHA-256 is persisted for duplicate detection and integrity evidence. Uploads are limited to five per authenticated user/device/IP window and require `X-Device-ID` for multipart uploads.

## Access and retention

Only the seller owner and platform administrators can request a document view URL. The repository re-reads owner access through a seller-scoped query. URLs are generated with the S3 request presigner for 15 minutes. Every view creates an audit record without recording file contents, credentials, or signed URL query parameters. No public CDN URL is returned.

KYC records use soft-delete fields already present in the seller document model. Permanent deletion, retention duration, legal hold, and malware scanning provider selection remain controlled compliance decisions and are not invented by this milestone. Uploaded documents remain `PENDING` until an authorized reviewer verifies or rejects them.

## APIs

- `GET/POST /api/v1/seller/kyc`
- `GET /api/v1/seller/kyc/{documentId}/view`
- `GET /api/v1/admin/seller/kyc`
- `POST /api/v1/admin/seller/kyc/{documentId}/review`
