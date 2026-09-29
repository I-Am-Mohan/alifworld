/**
 * AlifWorld OpenAPI 3.1 Specification Generator
 * Generates the authoritative REST API specification for mobile Flutter clients and third-party integrations.
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'AlifWorld Modular Monolith REST API',
    version: '1.0.0',
    description:
      'Authoritative REST API specification for the AlifWorld e-commerce platform and digital ecosystem. Serves storefront, seller portal, admin backoffice, and Flutter mobile applications with strict BDT/poisha financial precision and dual-language localization (bn-BD / en-BD).',
    contact: {
      name: 'AlifWorld Architecture & Engineering',
      email: 'engineering@alifworld.com',
      url: appUrl,
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: appUrl,
      description: 'Single-Application Monolith Server',
    },
  ],
  tags: [
    { name: 'System Health', description: 'Kubernetes and load balancer liveness/readiness probes' },
    { name: 'Root API', description: 'Root discovery endpoints and API metadata' },
    { name: 'Authentication', description: 'Customer and seller session management' },
    { name: 'Catalog', description: 'Categories, brands, products, and inventory' },
    { name: 'Order', description: 'Shopping cart, checkout, and order snapshotting' },
    { name: 'Wallet & Ledger', description: 'Double-entry wallet accounting and transaction logs' },
    { name: 'Product Points', description: 'Independent loyalty and point snapshotting' },
    { name: 'Payments & Settlements', description: 'Customer payment gateways, webhooks, partial refunds, 5% platform commissions, settlements, and BEFTN payouts' },
    { name: 'Database & Migrations', description: 'Data dictionary discovery, zero-downtime migration status, and schema health' },
    { name: 'Internationalization & Localization', description: 'Dynamic language management, default locale settings, and multilingual platform support' },
    { name: 'Seller Portal', description: 'Storefront management, settings, staff delegation, and KYC compliance' },
    { name: 'Identity & Access Management', description: 'RBAC roles, granular permissions, and identity governance' },
    { name: 'Customer Support', description: 'Omnichannel customer assistance, order incident tickets, and live SLA resolution' },
    { name: 'Logistics & Delivery', description: 'Delivery rider dispatch, assignment lease claiming, and live GPS telemetry' },
    { name: 'Customer & Ownership', description: 'Customer self-service, profile anti-tampering, and object-level ownership checks' },
    { name: 'Pricing & Tax', description: 'Authoritative server-side pricing resolution, cart quote calculation, promotions, and tax' },
    { name: 'Inventory & Warehousing', description: 'Platform fulfillment centers, merchant warehouses, and stock management across Bangladesh divisions' },
    { name: 'Audit & Compliance', description: 'Immutable security event auditing, business operation logs, and compliance exploration' },
  ],
  paths: {
    '/api/health/live': {
      get: {
        tags: ['System Health'],
        summary: 'Process Liveness Probe',
        description: 'Returns HTTP 200 if the Next.js process is active and accepting requests.',
        responses: {
          '200': {
            description: 'Process is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 120.45 },
                  },
                  required: ['status', 'timestamp', 'uptime'],
                },
              },
            },
          },
        },
      },
    },
    '/api/health/ready': {
      get: {
        tags: ['System Health'],
        summary: 'Dependency Readiness Probe',
        description: 'Returns HTTP 200 if database and cache dependencies are operational.',
        responses: {
          '200': {
            description: 'Dependencies operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    checks: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'connected' },
                        redis: { type: 'string', example: 'connected' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                  required: ['status', 'checks', 'timestamp'],
                },
              },
            },
          },
          '503': {
            description: 'One or more critical dependencies unavailable',
          },
        },
      },
    },
    '/api/v1': {
      get: {
        tags: ['Root API'],
        summary: 'API v1 Root Discovery',
        description: 'Returns platform metadata, supported currencies, minor units, and endpoints.',
        responses: {
          '200': {
            description: 'Metadata retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/openapi.json': {
      get: {
        tags: ['Root API'],
        summary: 'OpenAPI Schema Document',
        description: 'Returns the raw OpenAPI 3.1 schema JSON document.',
        responses: {
          '200': {
            description: 'OpenAPI schema JSON',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/v1/pricing/resolve': {
      post: {
        tags: ['Pricing & Tax'],
        summary: 'Resolve Variant Unit Price',
        description: 'Resolves authoritative unit price, volume breaks, and MAP floor protection for a product variant in integer poisha.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  variantId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', minimum: 1, default: 1 },
                  channel: { type: 'string', enum: ['RETAIL', 'B2B', 'CAMPAIGN', 'NEGOTIATED'], default: 'RETAIL' },
                  buyerSegment: { type: 'string' },
                },
                required: ['variantId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Variant price resolved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/pricing/quote': {
      post: {
        tags: ['Pricing & Tax'],
        summary: 'Calculate Authoritative Cart Quote',
        description: 'Calculates complete server-side price quote with price rules, stacked promotions, tax breakdown, seller vs platform attribution splits, Product Points, and grand total.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  lineItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        variantId: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer', minimum: 1, default: 1 },
                        sellerId: { type: 'string', format: 'uuid' },
                      },
                      required: ['variantId'],
                    },
                    minItems: 1,
                  },
                  channel: { type: 'string', enum: ['RETAIL', 'B2B', 'CAMPAIGN', 'NEGOTIATED'], default: 'RETAIL' },
                  buyerSegment: { type: 'string' },
                  couponCode: { type: 'string' },
                  shippingFeePoisha: { type: 'string', default: '0' },
                  priceIncludesTax: { type: 'boolean', default: false },
                },
                required: ['lineItems'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Quote calculated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/pricing/history': {
      get: {
        tags: ['Pricing & Tax'],
        summary: 'List Price History Audit Log',
        description: 'Lists append-only historical price change records for product variants with seller scoping and pagination.',
        parameters: [
          { name: 'variantId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'productId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Price history records retrieved',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/pricing/scheduled': {
      get: {
        tags: ['Pricing & Tax'],
        summary: 'List Scheduled Future Price Changes',
        description: 'Lists upcoming scheduled price rules and price lists starting in the future.',
        parameters: [
          { name: 'variantId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'productId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'channel', in: 'query', schema: { type: 'string', enum: ['RETAIL', 'B2B', 'CAMPAIGN', 'NEGOTIATED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Scheduled price changes retrieved',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/pricing/variants/{id}': {
      put: {
        tags: ['Pricing & Tax'],
        summary: 'Update Base Variant Price',
        description: 'Updates base variant pricing in integer poisha and appends a PriceHistory log entry.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pricePoisha: { type: 'string' },
                  compareAtPricePoisha: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['pricePoisha'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Variant base price updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/warehouses': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'List Warehouses and Fulfillment Hubs',
        description: 'Lists fulfillment centers and merchant warehouse facilities with division, active status, and seller filters.',
        parameters: [
          { name: 'division', in: 'query', schema: { type: 'string', enum: ['DHAKA', 'CHITTAGONG', 'RAJSHAHI', 'KHULNA', 'BARISAL', 'SYLHET', 'RANGPUR', 'MYMENSINGH'] } },
          { name: 'isPlatformHub', in: 'query', schema: { type: 'boolean' } },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Warehouses retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Create Warehouse or Fulfillment Hub',
        description: 'Creates a new warehouse or fulfillment hub. Sellers can create merchant warehouses; platform hubs require Admin role.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string', example: 'DHK-HUB-01' },
                  division: { type: 'string', enum: ['DHAKA', 'CHITTAGONG', 'RAJSHAHI', 'KHULNA', 'BARISAL', 'SYLHET', 'RANGPUR', 'MYMENSINGH'] },
                  district: { type: 'string' },
                  upazila: { type: 'string' },
                  addressLine: { type: 'string' },
                  postalCode: { type: 'string' },
                  isPlatformHub: { type: 'boolean', default: false },
                  isActive: { type: 'boolean', default: true },
                  sellerId: { type: 'string', format: 'uuid' },
                },
                required: ['name', 'code', 'division', 'district', 'addressLine'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Warehouse created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/warehouses/{id}': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'Get Warehouse by ID',
        description: 'Retrieves detailed warehouse configuration by ID.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Warehouse retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Inventory & Warehousing'],
        summary: 'Update Warehouse',
        description: 'Updates warehouse configuration with optimistic concurrency control.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  version: { type: 'integer', minimum: 1 },
                  name: { type: 'string' },
                  code: { type: 'string' },
                  division: { type: 'string' },
                  district: { type: 'string' },
                  upazila: { type: 'string' },
                  addressLine: { type: 'string' },
                  postalCode: { type: 'string' },
                  isActive: { type: 'boolean' },
                },
                required: ['version'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Warehouse updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Inventory & Warehousing'],
        summary: 'Soft Delete Warehouse',
        description: 'Soft deletes a warehouse by ID.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Warehouse soft-deleted successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/balances': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'List Inventory Stock Balances',
        description: 'Lists warehouse stock balances with on-hand, reserved, available, damaged, and quarantine counts.',
        parameters: [
          { name: 'warehouseId', in: 'query', schema: { type: 'string' } },
          { name: 'variantId', in: 'query', schema: { type: 'string' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
          { name: 'lowStockOnly', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': {
            description: 'Stock balances retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/balances/{id}': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'Get Stock Balance by ID',
        description: 'Retrieves a single stock balance record by ID.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Stock balance retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/movements': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'List Stock Movement Ledger Records',
        description: 'Lists append-only, immutable inventory movement ledger records with pagination and filtering.',
        parameters: [
          { name: 'warehouseId', in: 'query', schema: { type: 'string' } },
          { name: 'variantId', in: 'query', schema: { type: 'string' } },
          { name: 'stockBalanceId', in: 'query', schema: { type: 'string' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
          { name: 'movementType', in: 'query', schema: { type: 'string', enum: ['RECEIVE', 'RESERVE', 'RELEASE', 'COMMIT', 'ADJUST', 'RETURN', 'DAMAGE', 'WRITE_OFF'] } },
          { name: 'sourceType', in: 'query', schema: { type: 'string', enum: ['PURCHASE_ORDER', 'CHECKOUT_RESERVATION', 'ORDER_FULFILLMENT', 'RETURN_RMA', 'AUDIT_ADJUSTMENT'] } },
          { name: 'sourceId', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Stock movement ledger records retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/intake': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Receive Stock Intake',
        description: 'Receives incoming stock at a warehouse facility and appends an immutable RECEIVE movement.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  warehouseId: { type: 'string' },
                  variantId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  sourceType: { type: 'string', default: 'PURCHASE_ORDER' },
                  sourceId: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['warehouseId', 'variantId', 'quantity', 'sourceId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Stock received successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/reserve': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Atomically Reserve Stock',
        description: 'Atomically reserves available warehouse stock for a checkout session with deterministic TTL expiry and concurrency protection.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  warehouseId: { type: 'string' },
                  variantId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  cartId: { type: 'string' },
                  orderId: { type: 'string' },
                  ttlMinutes: { type: 'integer', default: 15 },
                },
                required: ['warehouseId', 'variantId', 'quantity'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Stock reserved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/adjust': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Manual Audit Stock Adjustment',
        description: 'Performs a manual audit inventory adjustment (ADJUST, DAMAGE, WRITE_OFF) with mandatory justification.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  stockBalanceId: { type: 'string' },
                  movementType: { type: 'string', enum: ['ADJUST', 'DAMAGE', 'WRITE_OFF'] },
                  quantityDelta: { type: 'integer' },
                  reason: { type: 'string' },
                },
                required: ['stockBalanceId', 'movementType', 'quantityDelta', 'reason'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Stock adjusted successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/quarantine': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Quarantine Stock Transfer / Release',
        description: 'Performs a quarantine transfer or release operation (QUARANTINE, RELEASE_TO_AVAILABLE, RELEASE_TO_DAMAGED).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  stockBalanceId: { type: 'string' },
                  action: { type: 'string', enum: ['QUARANTINE', 'RELEASE_TO_AVAILABLE', 'RELEASE_TO_DAMAGED'] },
                  quantity: { type: 'integer', minimum: 1 },
                  reason: { type: 'string' },
                },
                required: ['stockBalanceId', 'action', 'quantity', 'reason'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Quarantine operation completed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/release': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Release Stock Reservation',
        description: 'Idempotently releases an active checkout stock reservation, returning locked units to available stock balance.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reservationId: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['reservationId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Stock reservation released successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/commit': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Commit Stock Reservation',
        description: 'Idempotently commits an active checkout stock reservation upon order placement, decrementing physical on-hand and reserved balances simultaneously.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reservationId: { type: 'string' },
                  orderId: { type: 'string' },
                },
                required: ['reservationId', 'orderId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Stock reservation committed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/expire-stale': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Expire Stale Reservations Sweep',
        description: 'Automated worker trigger to sweep and expire stale active stock reservations whose TTL has passed.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cutoffDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Stale reservation expiry sweep completed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/compensate': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Compensating Inventory Operation',
        description: 'Executes a compensating transaction (order cancellation, payment failure, RMA return) restoring inventory balances with audit log traceability.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  warehouseId: { type: 'string' },
                  variantId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  orderId: { type: 'string' },
                  reservationId: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['warehouseId', 'variantId', 'quantity', 'reason'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Compensating inventory transaction executed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/alerts/low-stock': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'List Low Stock Alerts',
        description: 'Lists stock balances currently triggering low-stock alerts (available <= lowStockThreshold). Enforces seller-tenant scoping.',
        parameters: [
          { name: 'warehouseId', in: 'query', schema: { type: 'string' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of low stock alert balances',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/balances/{id}/thresholds': {
      put: {
        tags: ['Inventory & Warehousing'],
        summary: 'Update Stock Balance Thresholds',
        description: 'Configures lowStockThreshold and reorderPoint settings for a stock balance.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  lowStockThreshold: { type: 'integer', minimum: 0 },
                  reorderPoint: { type: 'integer', minimum: 0 },
                },
                required: ['lowStockThreshold', 'reorderPoint'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Stock thresholds updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/reorder-recommendations': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'List Reorder Recommendations',
        description: 'Lists calculated inventory reorder recommendations for items at or below reorderPoint with urgency classification.',
        parameters: [
          { name: 'warehouseId', in: 'query', schema: { type: 'string' } },
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of inventory reorder recommendations',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/transfers': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Initiate Inter-Warehouse Stock Transfer',
        description: 'Initiates a stock transfer between source and destination warehouses, setting state to IN_TRANSIT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fromWarehouseId: { type: 'string' },
                  toWarehouseId: { type: 'string' },
                  variantId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  reason: { type: 'string' },
                },
                required: ['fromWarehouseId', 'toWarehouseId', 'variantId', 'quantity'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Stock transfer initiated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/transfers/receive': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Receive Inter-Warehouse Stock Transfer',
        description: 'Receives an in-transit stock transfer at destination warehouse, setting state to COMPLETED.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  transferId: { type: 'string' },
                  receivedQuantity: { type: 'integer', minimum: 1 },
                  notes: { type: 'string' },
                },
                required: ['transferId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Stock transfer received successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/counts': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Initiate Physical Inventory Count Session',
        description: 'Initiates a physical inventory count audit session for warehouse stock reconciliation.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  warehouseId: { type: 'string' },
                  title: { type: 'string' },
                  notes: { type: 'string' },
                },
                required: ['warehouseId', 'title'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Physical inventory count session initiated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/counts/corrections/submit': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Submit Physical Count Variance Correction',
        description: 'Submits a physical count variance. Flags for Maker-Checker Dual Approval if variance > 10 units.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  countSessionId: { type: 'string' },
                  stockBalanceId: { type: 'string' },
                  countedQuantity: { type: 'integer', minimum: 0 },
                  reason: { type: 'string' },
                },
                required: ['countSessionId', 'stockBalanceId', 'countedQuantity', 'reason'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Count variance submitted successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/counts/corrections/approve': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Maker-Checker Approval of Inventory Correction',
        description: 'Maker-Checker Dual Approval for high-variance inventory count corrections. Enforces Gate-05 Maker-Checker invariant.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  correctionId: { type: 'string' },
                  approved: { type: 'boolean' },
                  rejectionReason: { type: 'string' },
                },
                required: ['correctionId', 'approved'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Maker-Checker approval action recorded successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/returns/intake': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Process RMA Return Intake',
        description: 'Processes incoming RMA return merchandise at a warehouse with initial disposition (QUARANTINE_INSPECTION, RESTOCK_AVAILABLE, MARK_DAMAGED).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rmaNumber: { type: 'string' },
                  orderId: { type: 'string' },
                  warehouseId: { type: 'string' },
                  variantId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  initialDisposition: { type: 'string', enum: ['QUARANTINE_INSPECTION', 'RESTOCK_AVAILABLE', 'MARK_DAMAGED'], default: 'QUARANTINE_INSPECTION' },
                  customerReason: { type: 'string' },
                },
                required: ['rmaNumber', 'orderId', 'warehouseId', 'variantId', 'quantity'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'RMA return intake processed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/returns/inspect': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Inspect Quarantined Returned Stock',
        description: 'Performs quality control inspection on quarantined returned stock, updating disposition to PASSED_RESTOCK, FAILED_DAMAGED, or FAILED_WRITE_OFF.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rmaNumber: { type: 'string' },
                  stockBalanceId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  inspectionResult: { type: 'string', enum: ['PASSED_RESTOCK', 'FAILED_DAMAGED', 'FAILED_WRITE_OFF'] },
                  inspectionNotes: { type: 'string' },
                },
                required: ['rmaNumber', 'stockBalanceId', 'quantity', 'inspectionResult', 'inspectionNotes'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Quarantine return inspection recorded successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/returns/restock': {
      post: {
        tags: ['Inventory & Warehousing'],
        summary: 'Restock Returned Merchandise',
        description: 'Restocks returned items directly into available warehouse inventory balance.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rmaNumber: { type: 'string' },
                  stockBalanceId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  reason: { type: 'string' },
                },
                required: ['rmaNumber', 'stockBalanceId', 'quantity'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Returned merchandise restocked successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/inventory/workspace/summary': {
      get: {
        tags: ['Inventory & Warehousing'],
        summary: 'Get Inventory Workspace Summary',
        description: 'Retrieves high-level inventory KPI metrics (total SKUs, on-hand, available, damaged, low-stock count, pending approvals). Enforces seller-tenant scoping.',
        parameters: [
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Inventory workspace summary metrics',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/search': {
      get: {
        tags: ['Search & Discovery'],
        summary: 'Search Products Catalog',
        description: 'Full-text product search with faceted filters, multi-lingual support (English & Bengali), price ranges in poisha, and automatic fallback to PostgreSQL.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search keyword' },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['en-BD', 'bn-BD'], default: 'en-BD' } },
          { name: 'categorySlug', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'brands', in: 'query', schema: { type: 'string' }, description: 'Comma-separated brand filter' },
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
          { name: 'minPricePoisha', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'maxPricePoisha', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'minRating', in: 'query', schema: { type: 'number', minimum: 0, maximum: 5 } },
          { name: 'minPoints', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'inStockOnly', in: 'query', schema: { type: 'boolean', default: false } },
          { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Comma-separated tags filter' },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'points_desc'], default: 'relevance' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Search results returned successfully with metadata and facets',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/search/health': {
      get: {
        tags: ['Search & Discovery'],
        summary: 'Search Subsystem Health & Degraded Mode Probe',
        description: 'Returns health readiness of primary Meilisearch engine and fallback PostgreSQL search engine, reporting degraded mode status.',
        responses: {
          '200': {
            description: 'Search subsystem health probe response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/search/index/rebuild': {
      post: {
        tags: ['Search & Discovery'],
        summary: 'Rebuild Full Search Catalog Index',
        description: 'Admin-only trigger to batch-extract and reindex all published products into search engines.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  batchSize: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Full catalog search reindexing completed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/search/index/sync': {
      post: {
        tags: ['Search & Discovery'],
        summary: 'Incrementally Synchronize Product Search Index',
        description: 'Synchronizes one or more products to the search index incrementally based on published/deleted state.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  productIds: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Product search index synchronized successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/search/degraded-mode': {
      get: {
        tags: ['Search & Discovery'],
        summary: 'Get Search Degraded Mode Telemetry',
        description: 'Retrieves current search telemetry metrics, failover query counters, and forced degraded mode status.',
        responses: {
          '200': {
            description: 'Search failover telemetry returned successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Search & Discovery'],
        summary: 'Configure Search Degraded Mode',
        description: 'Admin control to force search degraded mode or reset circuit breaker state.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  forced: { type: 'boolean' },
                  resetCircuit: { type: 'boolean' },
                },
                required: ['forced'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Search degraded mode configuration updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/cms/home': {
      get: {
        tags: ['CMS & Content'],
        summary: 'Get Localized Storefront Homepage',
        description: 'Retrieves published homepage layout, hero carousel banners, feature blocks, and category showcases localized for en-BD or bn-BD.',
        parameters: [
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['en-BD', 'bn-BD'], default: 'en-BD' } },
        ],
        responses: {
          '200': {
            description: 'Localized homepage layout returned successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['CMS & Content'],
        summary: 'Update Storefront Homepage Layout',
        description: 'Admin endpoint to update homepage sections, banner ordering, and promotional highlights with optimistic concurrency control.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  version: { type: 'integer', minimum: 1 },
                  status: { type: 'string', enum: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'], default: 'PUBLISHED' },
                  sections: { type: 'array', items: { type: 'object' } },
                },
                required: ['version', 'sections'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Homepage layout updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/catalog/landing/category/{slug}': {
      get: {
        tags: ['Discovery & Landing Pages'],
        summary: 'Get Category Landing Page',
        description: 'Retrieves category details, parent/child breadcrumb hierarchy, and filtered catalog products.',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['relevance', 'price_asc', 'price_desc', 'points_desc'] } },
        ],
        responses: {
          '200': {
            description: 'Category landing page details and products',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/catalog/landing/brand/{slug}': {
      get: {
        tags: ['Discovery & Landing Pages'],
        summary: 'Get Brand Flagship Landing Page',
        description: 'Retrieves brand profile, verified authority status, and brand product catalog.',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['relevance', 'price_asc', 'price_desc', 'points_desc'] } },
        ],
        responses: {
          '200': {
            description: 'Brand flagship page details and products',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/catalog/landing/collection/{slug}': {
      get: {
        tags: ['Discovery & Landing Pages'],
        summary: 'Get Collection Landing Page',
        description: 'Retrieves curated promotional collection landing page with member products.',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Collection details and products',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/catalog/products/{slug}': {
      get: {
        tags: ['Catalog & Products'],
        summary: 'Get Localized Product Details',
        description: 'Retrieves comprehensive product details, variant selection matrix, available inventory, and JSON-LD structured data. Supports permanent redirect instructions for historical slugs.',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['en-BD', 'bn-BD'], default: 'en-BD' } },
        ],
        responses: {
          '200': {
            description: 'Product details or redirect recommendation returned successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/catalog/products/{id}/reviews': {
      get: {
        tags: ['Product Reviews & Ratings'],
        summary: 'List Product Reviews',
        description: 'Retrieves verified customer reviews for a product with pagination, rating filters, and zero PII.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'rating', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5 } },
          { name: 'verifiedOnly', in: 'query', schema: { type: 'boolean' } },
          { name: 'withMediaOnly', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['recent', 'rating_desc', 'rating_asc', 'helpful'], default: 'recent' } },
        ],
        responses: {
          '200': {
            description: 'Product reviews list returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['Product Reviews & Ratings'],
        summary: 'Submit Verified Product Review',
        description: 'Submits a 1-5 star review with optional media attachments. Enforces delivered purchase invariant.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  title: { type: 'string' },
                  comment: { type: 'string', minLength: 10 },
                  media: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', format: 'uri' },
                        mediaType: { type: 'string', enum: ['IMAGE', 'VIDEO'] },
                        altText: { type: 'string' },
                      },
                      required: ['url'],
                    },
                  },
                },
                required: ['rating', 'comment'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Review created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/catalog/products/{id}/reviews/summary': {
      get: {
        tags: ['Product Reviews & Ratings'],
        summary: 'Get Product Rating Summary',
        description: 'Calculates aggregate average rating, total reviews count, verified purchases count, and 1-5 star distribution.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Rating summary returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/catalog/products/{id}/reviews/eligibility': {
      get: {
        tags: ['Product Reviews & Ratings'],
        summary: 'Check Customer Review Eligibility',
        description: 'Verifies whether authenticated customer has purchased and received delivery of this product.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Customer review eligibility returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/reviews/{id}': {
      put: {
        tags: ['Product Reviews & Ratings'],
        summary: 'Update Customer Review',
        description: 'Updates review rating, comment, or media attachments by author.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  title: { type: 'string' },
                  comment: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Review updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      delete: {
        tags: ['Product Reviews & Ratings'],
        summary: 'Delete Customer Review',
        description: 'Soft-deletes review by author or platform admin.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Review deleted successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/reviews/{id}/seller-response': {
      post: {
        tags: ['Product Reviews & Ratings'],
        summary: 'Official Seller Response',
        description: 'Verified seller responds to a customer review on their product.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerResponse: { type: 'string', minLength: 5 },
                },
                required: ['sellerResponse'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Seller response saved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/reviews/{id}/vote': {
      post: {
        tags: ['Product Reviews & Ratings'],
        summary: 'Vote Review Helpful',
        description: 'Customer marks review as helpful or unhelpful.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isHelpful: { type: 'boolean' },
                },
                required: ['isHelpful'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Vote recorded successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/catalog/products/{id}/questions': {
      get: {
        tags: ['Product Q&A'],
        summary: 'List Product Questions & Answers',
        description: 'Retrieves approved customer inquiries and official seller answers with zero PII.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'answeredOnly', in: 'query', schema: { type: 'boolean' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['recent', 'upvotes', 'unanswered'], default: 'recent' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Product questions returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['Product Q&A'],
        summary: 'Submit Product Question',
        description: 'Customer submits a pre-sale question about a product.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  question: { type: 'string', minLength: 10, maxLength: 1000 },
                },
                required: ['question'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Question submitted successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/catalog/products/{id}/questions/summary': {
      get: {
        tags: ['Product Q&A'],
        summary: 'Get Product Q&A Summary',
        description: 'Retrieves total, answered, and unanswered question counts.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Q&A summary returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/questions/{id}/answers': {
      post: {
        tags: ['Product Q&A'],
        summary: 'Post Official Seller Answer',
        description: 'Verified seller answers a customer question on their product. Strictly scoped to seller tenant.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  answer: { type: 'string', minLength: 5, maxLength: 2000 },
                },
                required: ['answer'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Answer posted successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/questions/{id}/vote': {
      post: {
        tags: ['Product Q&A'],
        summary: 'Vote on Question',
        description: 'Toggles an upvote on a customer question.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Vote recorded successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/answers/{id}/vote': {
      post: {
        tags: ['Product Q&A'],
        summary: 'Vote on Answer',
        description: 'Toggles an upvote on an answer.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Vote recorded successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/seller/questions': {
      get: {
        tags: ['Product Q&A'],
        summary: 'List Seller Questions',
        description: 'Seller operational endpoint to view questions across their store catalog.',
        parameters: [
          { name: 'answered', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Seller questions listed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/sellers/{slug}/storefront': {
      get: {
        tags: ['Seller Operations'],
        summary: 'Get Public Seller Storefront',
        description: 'Retrieves public seller store profile, business policies, and catalog products strictly scoped to the seller ID.',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'categorySlug', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['relevance', 'price_asc', 'price_desc', 'points_desc'] } },
        ],
        responses: {
          '200': {
            description: 'Public seller store profile and catalog',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/seo/metadata': {
      get: {
        tags: ['SEO & Metadata'],
        summary: 'Get Entity SEO Metadata and Schema.org JSON-LD',
        description: 'Retrieves canonical URLs, localized hreflang links, OpenGraph/Twitter social cards, and Schema.org JSON-LD for products, categories, brands, collections, and sellers.',
        parameters: [
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['product', 'category', 'brand', 'seller', 'collection'] } },
          { name: 'slug', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['en-BD', 'bn-BD'], default: 'en-BD' } },
        ],
        responses: {
          '200': {
            description: 'SEO metadata and JSON-LD returned successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/customer/preferences': {
      get: {
        tags: ['Customer Experience'],
        summary: 'Get Customer Preferences',
        description: 'Retrieves notification and marketing communication preferences.',
        responses: {
          '200': {
            description: 'Customer preferences returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      put: {
        tags: ['Customer Experience'],
        summary: 'Update Customer Preferences',
        description: 'Updates email, SMS, and promotional communication preferences.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  emailMarketing: { type: 'boolean' },
                  smsMarketing: { type: 'boolean' },
                  orderStatusUpdates: { type: 'boolean' },
                  promotionalPush: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Preferences updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/consent': {
      get: {
        tags: ['Customer Experience'],
        summary: 'Get Customer Regulatory Consent',
        description: 'Retrieves customer agreement to terms, privacy policies, and marketing consent.',
        responses: {
          '200': {
            description: 'Consent status returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      put: {
        tags: ['Customer Experience'],
        summary: 'Update Customer Consent',
        description: 'Updates regulatory consent records with version tracking.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  termsAccepted: { type: 'boolean' },
                  termsVersion: { type: 'string' },
                  privacyAccepted: { type: 'boolean' },
                  privacyVersion: { type: 'string' },
                  marketingConsent: { type: 'boolean' },
                },
                required: ['termsAccepted', 'termsVersion', 'privacyAccepted', 'privacyVersion'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Consent updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/security': {
      get: {
        tags: ['Customer Experience'],
        summary: 'Get Account Security Overview',
        description: 'Retrieves password status, 2FA status, verification status, and active session count.',
        responses: {
          '200': {
            description: 'Security overview returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['Customer Experience'],
        summary: 'Change Customer Password',
        description: 'Verifies current password, applies cryptographic hashing to new password, and invalidates other active sessions.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string' },
                  confirmPassword: { type: 'string' },
                },
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed successfully and sessions invalidated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/organization': {
      get: {
        tags: ['Customer Experience'],
        summary: 'Get Business Buyer Organization',
        description: 'Retrieves B2B organization details and private credit limits for approved members.',
        responses: {
          '200': {
            description: 'Organization details returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['Customer Experience'],
        summary: 'Register Business Buyer Organization',
        description: 'Applies to register account as an approved B2B wholesale buyer organization.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  companyName: { type: 'string' },
                  businessType: { type: 'string', enum: ['CORPORATION', 'LLC', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP'] },
                  tradeLicenseNumber: { type: 'string' },
                  binNumber: { type: 'string' },
                  tinNumber: { type: 'string' },
                },
                required: ['companyName', 'businessType', 'tradeLicenseNumber'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Business buyer application submitted successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/organization': {
      get: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Get Buyer Organization',
        description: 'Retrieves active Business Buyer Organization details for authenticated customer.',
        responses: {
          '200': {
            description: 'Organization details returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Register Buyer Organization',
        description: 'Registers a customer as a new Business Buyer organization in PENDING_APPROVAL status with credit terms disabled.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  companyName: { type: 'string' },
                  businessType: { type: 'string', enum: ['CORPORATION', 'LLC', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP'] },
                  tradeLicenseNumber: { type: 'string' },
                  binNumber: { type: 'string' },
                  tinNumber: { type: 'string' },
                },
                required: ['companyName', 'businessType'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Organization registered successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/organization/members': {
      get: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'List Organization Members',
        description: 'Lists all members and their roles within the buyer organization.',
        responses: {
          '200': {
            description: 'Members listed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Invite Organization Member',
        description: 'Adds or invites a new member with role and optional internal spending limit.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'PURCHASER', 'APPROVER', 'VIEWER'] },
                  spendingLimitPoisha: { type: 'integer' },
                },
                required: ['userId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Member added successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/rfqs': {
      get: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'List RFQs',
        description: 'Lists Requests for Quote for buyer organization or seller.',
        responses: {
          '200': {
            description: 'RFQs listed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Create RFQ',
        description: 'Submits a new Request for Quote with line items, PO reference, and Minimum Order Quantity (MOQ) validation.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerId: { type: 'string' },
                  title: { type: 'string' },
                  purchaseOrderRef: { type: 'string' },
                  requiredDeliveryDate: { type: 'string', format: 'date-time' },
                  shippingAddress: { type: 'string' },
                  notes: { type: 'string' },
                  expiresInDays: { type: 'integer' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string' },
                        variantId: { type: 'string' },
                        productTitle: { type: 'string' },
                        quantity: { type: 'integer' },
                        targetPricePoisha: { type: 'integer' },
                        specifications: { type: 'string' },
                      },
                      required: ['productId', 'productTitle', 'quantity'],
                    },
                  },
                },
                required: ['title', 'items'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'RFQ created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/rfqs/{id}': {
      get: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Get RFQ Details',
        description: 'Retrieves RFQ details with items and quote counts.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'RFQ details returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      delete: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Cancel RFQ',
        description: 'Cancels an open RFQ.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'RFQ cancelled successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/quotes': {
      get: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'List Quotes',
        description: 'Lists quotes responding to RFQs.',
        responses: {
          '200': {
            description: 'Quotes listed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Create Seller Quote',
        description: 'Seller creates a formal quote response with unit prices, quantity breaks, and payment terms.',
        parameters: [{ name: 'rfqId', in: 'query', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  validUntilDays: { type: 'integer' },
                  shippingPoisha: { type: 'integer' },
                  taxPoisha: { type: 'integer' },
                  paymentTerms: { type: 'string', enum: ['IMMEDIATE', 'NET_15', 'NET_30', 'NET_60'] },
                  notes: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string' },
                        variantId: { type: 'string' },
                        productTitle: { type: 'string' },
                        quantity: { type: 'integer' },
                        unitPricePoisha: { type: 'integer' },
                        quantityBreakTier: { type: 'string' },
                        leadTimeDays: { type: 'integer' },
                      },
                      required: ['productId', 'productTitle', 'quantity', 'unitPricePoisha'],
                    },
                  },
                },
                required: ['items'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Quote created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/quotes/{id}': {
      get: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Get Quote Details',
        description: 'Retrieves full quote details, items, and negotiation versions.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Quote details returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/quotes/{id}/accept': {
      post: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Accept Quote',
        description: 'Buyer accepts an approved quote before expiration.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Quote accepted successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/b2b/quotes/{id}/convert': {
      post: {
        tags: ['B2B & Negotiated Commerce'],
        summary: 'Convert Quote to Cart',
        description: 'Converts an accepted quote to an active Cart with locked negotiated pricing.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Quote converted to cart successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/wishlists': {
      get: {
        tags: ['Customer Experience'],
        summary: 'List Customer Wishlists',
        description: 'Retrieves all wishlists belonging to the authenticated customer.',
        responses: {
          '200': {
            description: 'Customer wishlists returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['Customer Experience'],
        summary: 'Create Customer Wishlist',
        description: 'Creates a new custom wishlist for saving products.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  visibility: { type: 'string', enum: ['PRIVATE', 'PUBLIC', 'SHARED_LINK'], default: 'PRIVATE' },
                },
                required: ['title'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Wishlist created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/wishlists/{id}': {
      get: {
        tags: ['Customer Experience'],
        summary: 'Get Customer Wishlist by ID',
        description: 'Retrieves a single customer wishlist verifying self-ownership.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Wishlist retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      put: {
        tags: ['Customer Experience'],
        summary: 'Update Customer Wishlist',
        description: 'Updates wishlist title, description, or visibility.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  visibility: { type: 'string', enum: ['PRIVATE', 'PUBLIC', 'SHARED_LINK'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Wishlist updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      delete: {
        tags: ['Customer Experience'],
        summary: 'Delete Custom Wishlist',
        description: 'Deletes a custom customer wishlist. (Default wishlist cannot be deleted).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Wishlist deleted successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/wishlists/{id}/items': {
      post: {
        tags: ['Customer Experience'],
        summary: 'Add Item to Wishlist',
        description: 'Adds a product variant item to a customer wishlist with price and point snapshots.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  variantId: { type: 'string' },
                  notes: { type: 'string' },
                },
                required: ['productId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Item added to wishlist successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/wishlists/{id}/items/{itemId}': {
      delete: {
        tags: ['Customer Experience'],
        summary: 'Remove Item from Wishlist',
        description: 'Removes a specific item from a customer wishlist.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Item removed from wishlist successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/wishlists/{id}/share': {
      post: {
        tags: ['Customer Experience'],
        summary: 'Generate or Revoke Wishlist Share Link',
        description: 'Creates a unique cryptographic share token or revokes public sharing.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  action: { type: 'string', enum: ['GENERATE', 'REVOKE'] },
                },
                required: ['action'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Share link generated or revoked successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/wishlists/shared/{token}': {
      get: {
        tags: ['Customer Experience'],
        summary: 'View Shared Wishlist',
        description: 'Public endpoint to view a shared customer wishlist. Redacts all customer PII.',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Shared wishlist view returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register Customer Account',
        description: 'Registers a new customer account, assigns CUSTOMER role, initializes 4 segregated wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY), and dispatches email verification OTP.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CustomerRegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Customer registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CustomerRegisterResponse' },
              },
            },
          },
          '409': {
            description: 'Account with email or phone already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/email/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Customer Email Address',
        description: 'Verifies a customer email address using a 6-digit ephemeral OTP token. Validates attempt limits (max 3), marks user email as verified, invalidates token, records audit log, and emits auth.email_verified outbox event.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyEmailRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerifyEmailResponse' },
              },
            },
          },
          '404': {
            description: 'User account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Verification code expired, invalid, or attempt lockout',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/email/resend': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend Email Verification Code',
        description: 'Resends a fresh 6-digit verification code with 60-second cooldown enforcement and 3 requests/hour limit. Returns neutral response for unregistered emails to prevent enumeration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResendVerificationRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification code resent successfully or neutral notice',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResendVerificationResponse' },
              },
            },
          },
          '429': {
            description: 'Rate limit or cooldown exceeded (60s cooldown or max 3 per hour)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/check': {
      post: {
        tags: ['Authentication'],
        summary: 'Check Phone Registration Status',
        description: 'Verifies whether a Bangladesh mobile number is already registered in the system, directing client state to login OTP or guided onboarding registration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneCheckRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Phone check result returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhoneCheckResponse' },
              },
            },
          },
          '422': {
            description: 'Validation failed (invalid phone number)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/send-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Send Phone Verification OTP',
        description: 'Dispatches a 6-digit ephemeral OTP to the specified Bangladesh mobile number with 60-second cooldown and hourly rate limits.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneSendOtpRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP dispatched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhoneSendOtpResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid phone or purpose mismatch',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '429': {
            description: 'Cooldown or rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/verify-login': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Phone Login OTP & Issue Session',
        description: 'Verifies 6-digit login OTP for an existing phone user, issues access + rotating refresh tokens, and establishes HttpOnly session cookies.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneVerifyLoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful, session established',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid, expired OTP or account lockout',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/verify-register': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Registration OTP & Issue Ticket',
        description: 'Verifies 6-digit OTP for an onboarding mobile number and issues a cryptographically signed HMAC registration ticket.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneVerifyRegisterRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP verified, registration ticket returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhoneVerifyRegisterResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid or expired OTP',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/complete-registration': {
      post: {
        tags: ['Authentication'],
        summary: 'Complete Phone Registration Wizard',
        description: 'Validates registration ticket, creates customer record, provisions 4 segregated wallets and point account, saves optional demographics, and establishes authenticated session.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneCompleteRegistrationRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration completed and logged in',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid ticket, password policy mismatch, or validation failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Authentication & Token Issuance',
        description: 'Authenticates a user via email or Bangladesh mobile number, issues short-lived JWT access token and single-use rotating refresh token. Sets HttpOnly cookies for web browsers and provides Bearer tokens for mobile Flutter clients.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful, tokens issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials or account suspended',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate Refresh Token & Detect Family Reuse',
        description: 'Rotates a single-use refresh token within an authenticated token family. Issues fresh access token and next-generation refresh token. If a previously consumed token is presented, detects security breach, revokes the entire token family, and terminates active sessions.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token rotated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized, session expired, or token reuse detected',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed or refresh token missing',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Current Authenticated User Profile',
        description: 'Retrieves active user profile, assigned RBAC roles, granular permissions, segregated wallet balances, and decoupled loyalty points for the current session.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CurrentUserProfileResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized or token expired/revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'User Logout & Session Revocation',
        description: 'Terminates active session in the database, records audit log, and clears HttpOnly authentication cookies.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LogoutResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions': {
      get: {
        tags: ['Authentication'],
        summary: 'List Active User Sessions & Devices',
        description: 'Returns all active authenticated sessions and registered devices for the current user, flagging the current session.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of active sessions returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SessionListResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized or session expired',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions/{sessionId}': {
      delete: {
        tags: ['Authentication'],
        summary: 'Revoke Specific Session/Device',
        description: 'Revokes a single active session belonging to the authenticated user. If the session is the current one, clears cookies.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique ID of the session to terminate',
          },
        ],
        responses: {
          '200': {
            description: 'Session revoked successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevokeSessionResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '404': {
            description: 'Session not found or belongs to another user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions/revoke-others': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke All Other Sessions',
        description: 'Revokes all active sessions for the current user except the current active session.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'All other sessions revoked successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevokeOthersResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions/revoke-all': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke All Sessions Globally',
        description: 'Terminates all active sessions for the user, increments tokenVersion to immediately invalidate all access tokens, clears cookies, and forces re-login.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'All sessions revoked globally',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevokeAllResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/password/request-reset': {
      post: {
        tags: ['Authentication'],
        summary: 'Request Password Reset',
        description: 'Queues a one-time 15-minute password reset link. The response is deliberately neutral for known and unknown email addresses. Requests are limited to one per minute and three per hour per account.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Neutral reset-request acknowledgement',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PasswordResetRequestResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid email or locale',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '503': {
            description: 'Reset notification could not be queued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/password/reset': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset Password with One-Time Token',
        description: 'Consumes a hashed one-time reset token, rejects compromised or reused passwords, updates the password, increments tokenVersion, and revokes every active session atomically.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetCompletionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset and all sessions revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PasswordMutationResponse' },
              },
            },
          },
          '409': {
            description: 'The one-time token was consumed concurrently',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Invalid token or password policy failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/password/change': {
      post: {
        tags: ['Authentication'],
        summary: 'Change Authenticated User Password',
        description: 'Verifies the current password, rejects compromised or reused passwords, changes the credential, increments tokenVersion, and revokes every active session atomically.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordChangeRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed and all sessions revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PasswordMutationResponse' },
              },
            },
          },
          '401': {
            description: 'Authentication failed or current password is incorrect',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Password policy failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/token/policy': {
      get: {
        tags: ['Authentication'],
        summary: 'Authentication Token Policy Discovery',
        description: 'Returns authoritative token TTL configurations, cookie parameters, and password complexity requirements.',
        responses: {
          '200': {
            description: 'Token policy retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenPolicyResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/csrf': {
      get: {
        tags: ['Authentication'],
        summary: 'Provision Anti-CSRF Token',
        description: 'Generates an authentic cryptographically signed anti-CSRF token, provisions the aw_csrf cookie, and returns token metadata for client mutation headers.',
        responses: {
          '200': {
            description: 'Anti-CSRF token provisioned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        csrfToken: { type: 'string', example: '9a8b7c...1727050000000.f4e3d2...' },
                        headerName: { type: 'string', example: 'x-csrf-token' },
                        expiresInSeconds: { type: 'number', example: 86400 },
                      },
                      required: ['csrfToken', 'headerName', 'expiresInSeconds'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/token/introspect': {
      post: {
        tags: ['Authentication'],
        summary: 'Introspect Access Token',
        description: 'RFC 7662 compliant token introspection verifying active state, tokenVersion, and session validity.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TokenIntrospectRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token introspection result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenIntrospectResponse' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/oauth/google': {
      get: {
        tags: ['Authentication'],
        summary: 'Initiate Google OAuth Flow',
        description: 'Initiates Google OpenID Connect authorization code flow with HMAC anti-CSRF state token and HttpOnly nonce cookie.',
        parameters: [
          {
            name: 'returnUrl',
            in: 'query',
            description: 'Post-authentication redirection URL',
            schema: { type: 'string', default: '/' },
          },
          {
            name: 'clientType',
            in: 'query',
            description: 'Client platform type',
            schema: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER'], default: 'WEB' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to Google accounts authorization page',
          },
        },
      },
    },
    '/api/v1/auth/oauth/google/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Handle Google OAuth Redirect Callback',
        description: 'Verifies state anti-CSRF cookie, exchanges code for Google tokens, links or registers customer account, initializes 4 segregated wallets, and sets session cookies.',
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'state',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to returnUrl with session established in cookies',
          },
        },
      },
    },
    '/api/v1/auth/oauth/google/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Google ID Token (Flutter / Mobile)',
        description: 'Verifies native Google ID token from Flutter SDK, links or provisions customer account, and issues Bearer access and refresh token pair.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthVerifyRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthVerifyResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid token credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/oauth/facebook': {
      get: {
        tags: ['Authentication'],
        summary: 'Initiate Facebook OAuth Flow',
        description: 'Initiates Facebook OAuth 2.0 authorization code flow with HMAC anti-CSRF state token.',
        parameters: [
          {
            name: 'returnUrl',
            in: 'query',
            description: 'Post-authentication redirection URL',
            schema: { type: 'string', default: '/' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to Facebook OAuth dialog',
          },
        },
      },
    },
    '/api/v1/auth/oauth/facebook/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Handle Facebook OAuth Redirect Callback',
        description: 'Verifies state anti-CSRF token, exchanges code for Facebook access token, links or registers customer account, provisions wallets, and sets session cookies.',
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'state',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to returnUrl with session established in cookies',
          },
        },
      },
    },
    '/api/v1/auth/oauth/facebook/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Facebook Access Token (Flutter / Mobile)',
        description: 'Verifies native Facebook access token from Flutter SDK, links or provisions customer account, and issues Bearer token pair.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthVerifyRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthVerifyResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid token credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/customer/dashboard': {
      get: {
        tags: ['Customer Experience'],
        summary: 'Get Customer Dashboard Overview',
        description: 'Aggregates profile greeting, active and completed order counts, Product Points, Customer Club rank, wallet balances, default address, and recent notification alerts.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Customer dashboard overview returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/api/v1/customer/orders': {
      get: {
        tags: ['Customer Experience'],
        summary: 'List Customer Orders',
        description: 'Retrieves paginated parent orders belonging to authenticated customer with item snapshots, status history, and tracking links.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Customer orders retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/orders/{id}': {
      get: {
        tags: ['Customer Experience', 'Order'],
        summary: 'Get Customer Parent Order Detail',
        description: 'Retrieves a single unified parent order view for the authenticated customer. Enforces self-ownership; cross-customer access returns 403.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'ord_12345' }, description: 'Order ID or orderNumber (ORD-YYYYMMDD-XXXX)' },
        ],
        responses: {
          '200': {
            description: 'Customer parent order with fulfillment packages, status timeline, and self-service actions',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '403': { description: 'Ownership violation — order belongs to another customer' },
          '404': { description: 'Order not found' },
        },
      },
    },
    '/api/v1/customer/orders/{id}/cancel': {
      post: {
        tags: ['Customer Experience', 'Order'],
        summary: 'Cancel Customer Order (Self-Service)',
        description: 'Cancels a parent order if all seller fulfillment groups are still in PENDING or ACCEPTED status. Appends audit trail entry.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  reason: { type: 'string', minLength: 3, maxLength: 500, example: 'Found a better price elsewhere' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Order cancelled successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '403': { description: 'Ownership violation' },
          '404': { description: 'Order not found' },
          '422': { description: 'Validation failed or order not eligible for cancellation' },
        },
      },
    },
    '/api/v1/customer/orders/{id}/reorder': {
      post: {
        tags: ['Customer Experience'],
        summary: 'Reorder Past Order Items',
        description: 'Order Shortcut: Quickly re-adds all items from a past order into the active cart with live price and stock validation.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Items reordered into cart successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/notifications/preferences': {
      get: {
        tags: ['Customer Experience'],
        summary: 'Get Notification Preferences Matrix',
        description: 'Retrieves granular notification preferences across SMS, Email, Push, and WhatsApp with mandatory security flags.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Notification preferences matrix returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      put: {
        tags: ['Customer Experience'],
        summary: 'Update Notification Preferences Matrix',
        description: 'Updates notification channel preferences while strictly preserving mandatory security alert requirements.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  preferences: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        channel: { type: 'string', enum: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'] },
                        eventType: { type: 'string', enum: ['ORDER_STATUS_CHANGES', 'DELIVERY_DISPATCH_ALERTS', 'PRICE_DROP_ALERTS', 'RESTOCK_ALERTS', 'MARKETING_PROMOTIONS', 'SECURITY_ALERTS'] },
                        enabled: { type: 'boolean' },
                      },
                      required: ['channel', 'eventType', 'enabled'],
                    },
                  },
                },
                required: ['preferences'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Notification preferences updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/notifications': {
      get: {
        tags: ['Customer Experience'],
        summary: 'List Customer Notifications',
        description: 'Retrieves recent notification deliveries for the authenticated customer.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }],
        responses: {
          '200': {
            description: 'Notifications list returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/notifications/{id}/read': {
      patch: {
        tags: ['Customer Experience'],
        summary: 'Mark Notification as Read',
        description: 'Updates notification status to READ.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Notification marked as read',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/notifications/read-all': {
      post: {
        tags: ['Customer Experience'],
        summary: 'Mark All Notifications Read',
        description: 'Marks all unread customer notifications as read.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'All notifications marked as read',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/customer/profile': {
      get: {
        tags: ['Customer & Ownership'],
        summary: 'Get Customer Profile',
        description: 'Retrieves the authenticated customer\'s own profile. Strictly enforces self-ownership against unauthorized snooping.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Customer profile retrieved',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Ownership violation' },
        },
      },
      put: {
        tags: ['Customer & Ownership'],
        summary: 'Update Customer Profile',
        description: 'Updates customer profile fields. Strictly prevents modifying internal security fields (status, roles, walletBalance) via privilege escalation barriers.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Rahim Khan' },
                  avatarUrl: { type: 'string', example: `${appUrl}/avatars/usr_1.jpg` },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Privilege escalation or ownership violation' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/cart': {
      get: {
        tags: ['Customer & Ownership'],
        summary: 'Get Active Shopping Cart',
        description: 'Retrieves the authenticated customer\'s own shopping cart or ephemeral guest cart by token.',
        parameters: [{ name: 'x-guest-cart-token', in: 'header', required: false, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Shopping cart retrieved',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['Customer & Ownership'],
        summary: 'Add Published Variant to Cart',
        description: 'Price and Product Points come from the active published BDT variant on the server with inventory validation.',
        parameters: [{ name: 'x-guest-cart-token', in: 'header', required: false, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  variantId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  guestCartToken: { type: 'string' },
                },
                required: ['variantId', 'quantity'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Cart item added successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '404': { description: 'Variant unavailable' },
          '422': { description: 'Invalid quantity or stock exceeded' },
        },
      },
      delete: {
        tags: ['Customer & Ownership'],
        summary: 'Clear Active Shopping Cart',
        description: 'Soft-deletes all line items from the active cart.',
        responses: {
          '200': {
            description: 'Cart cleared successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/cart/items/{itemId}': {
      patch: {
        tags: ['Customer & Ownership'],
        summary: 'Update Cart Item Quantity',
        description: 'Updates quantity with live stock limit validation. Setting quantity to 0 removes item.',
        parameters: [
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'x-guest-cart-token', in: 'header', required: false, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { quantity: { type: 'integer', minimum: 0 } },
                required: ['quantity'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Quantity updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '404': { description: 'Item not found' },
          '422': { description: 'Stock limit exceeded' },
        },
      },
      delete: {
        tags: ['Customer & Ownership'],
        summary: 'Remove Cart Item',
        description: 'Soft-deletes line item from active cart.',
        parameters: [
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'x-guest-cart-token', in: 'header', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Item removed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/cart/grouped': {
      get: {
        tags: ['Customer & Ownership'],
        summary: 'Get Multi-Vendor Grouped Cart',
        description: 'Retrieves active cart partitioned into distinct seller fulfillment packages with calculated shipping fees, free shipping progress, lead times, and fulfillment constraints.',
        parameters: [
          { name: 'x-guest-cart-token', in: 'header', required: false, schema: { type: 'string' } },
          { name: 'division', in: 'query', required: false, schema: { type: 'string', default: 'DHAKA' } },
        ],
        responses: {
          '200': {
            description: 'Grouped cart packages returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/cart/coupons': {
      post: {
        tags: ['Customer & Ownership'],
        summary: 'Apply Coupon to Cart',
        description: 'Applies a promotional discount or coupon code to the active cart, validating minimum spend, validity period, and seller restrictions.',
        parameters: [{ name: 'x-guest-cart-token', in: 'header', required: false, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  couponCode: { type: 'string' },
                  guestCartToken: { type: 'string' },
                },
                required: ['couponCode'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Coupon applied and cart revalidated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Coupon invalid, expired, or requirements not met' },
        },
      },
      delete: {
        tags: ['Customer & Ownership'],
        summary: 'Remove Coupon from Cart',
        description: 'Removes any active coupon from the cart and recalculates totals.',
        parameters: [{ name: 'x-guest-cart-token', in: 'header', required: false, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Coupon removed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/cart/merge': {
      post: {
        tags: ['Customer & Ownership'],
        summary: 'Merge Guest Cart to Authenticated Cart',
        description: 'Safely merges an ephemeral guest cart into the logged-in customer cart. Deduplicates variants, caps quantities at available stock, re-snapshots live catalog prices and Product Points, and marks guest cart as MERGED.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { guestCartToken: { type: 'string' } },
                required: ['guestCartToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Guest cart merged successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/api/v1/cart/revalidate': {
      post: {
        tags: ['Customer & Ownership'],
        summary: 'Revalidate Cart Pricing & Inventory',
        description: 'Revalidates live catalog prices, Product Points, and inventory levels against snapshots in the cart.',
        responses: {
          '200': {
            description: 'Cart revalidated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/cart/checkout': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Checkout Cart with Ownership & Idempotency Check',
        description: 'Executes authoritative server-side checkout for the customer\'s owned cart with multi-vendor seller fulfillment group partitioning and B2B quote pricing locks. Requires Idempotency-Key header.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128 } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string', example: 'crt_12345' },
                  checkout: { type: 'object' },
                  couponCode: { type: 'string' },
                },
                required: ['cartId', 'checkout'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '200': {
            description: 'Idempotent replay: previously committed order returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Cart ownership violation' },
          '409': { description: 'Cart changed or request conflicts with an existing checkout' },
          '422': { description: 'Invalid checkout parameters or missing Idempotency-Key' },
        },
      },
    },
    '/api/v1/checkout': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Unified Mobile & Web Checkout Pipeline',
        description: 'Authoritative checkout pipeline endpoint for mobile and web applications.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128 } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string' },
                  checkout: { type: 'object' },
                  couponCode: { type: 'string' },
                },
                required: ['cartId', 'checkout'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '200': {
            description: 'Idempotent replay: previously committed order returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '422': { description: 'Validation failed or missing Idempotency-Key' },
        },
      },
    },
    '/api/v1/checkout/quote': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Calculate Authoritative Checkout Quote & Taxes',
        description: 'Calculates authoritative server-side checkout totals including price verification, NBR Mushak-6.3 VAT, coupon discounts, shipping rates, and discrete Product Points.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        variantId: { type: 'string' },
                        quantity: { type: 'integer' },
                      },
                      required: ['variantId', 'quantity'],
                    },
                  },
                  shippingAddress: {
                    type: 'object',
                    properties: {
                      division: { type: 'string' },
                      district: { type: 'string' },
                      upazila: { type: 'string' },
                      postalCode: { type: 'string' },
                      streetAddress: { type: 'string' },
                    },
                    required: ['division', 'district'],
                  },
                  couponCode: { type: 'string' },
                  shippingMethod: { type: 'string', enum: ['STANDARD', 'EXPRESS', 'SAME_DAY', 'NEXT_DAY', 'HEAVY_FREIGHT'], default: 'STANDARD' },
                },
                required: ['shippingAddress'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Checkout quote and itemized calculation breakdown returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/checkout/review': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Compile Final Pre-Placement Order Review',
        description: 'Compiles final order review with multi-seller package grouping, discrete Product Points, payment readiness, regulatory consents, and cryptographic review fingerprint.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string' },
                  recipient: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      phone: { type: 'string' },
                      division: { type: 'string' },
                      district: { type: 'string' },
                      upazila: { type: 'string' },
                      address: { type: 'string' },
                      postalCode: { type: 'string' },
                    },
                    required: ['name', 'phone', 'division', 'district', 'address'],
                  },
                  paymentMethod: { type: 'string', default: 'COD' },
                  couponCode: { type: 'string' },
                  codVerificationToken: { type: 'string' },
                },
                required: ['cartId', 'recipient'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Order review and consent declaration returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/checkout/place-order': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Place Order Atomically with Consumer Consent',
        description: 'Commits atomic place-order transaction with explicit terms consent, idempotency protection, multi-seller partitioning, and append-only status history.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string' },
                  reviewFingerprint: { type: 'string' },
                  recipient: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      phone: { type: 'string' },
                      division: { type: 'string' },
                      district: { type: 'string' },
                      upazila: { type: 'string' },
                      address: { type: 'string' },
                      postalCode: { type: 'string' },
                    },
                    required: ['name', 'phone', 'division', 'district', 'address'],
                  },
                  paymentMethod: { type: 'string' },
                  codVerificationToken: { type: 'string' },
                  couponCode: { type: 'string' },
                  consent: {
                    type: 'object',
                    properties: {
                      termsAccepted: { type: 'boolean' },
                      termsVersion: { type: 'string' },
                      privacyAccepted: { type: 'boolean' },
                      privacyVersion: { type: 'string' },
                      returnPolicyAccepted: { type: 'boolean' },
                      returnPolicyVersion: { type: 'string' },
                      codAgreementAccepted: { type: 'boolean' },
                      marketingConsent: { type: 'boolean' },
                    },
                    required: ['termsAccepted', 'termsVersion', 'privacyAccepted', 'privacyVersion', 'returnPolicyAccepted', 'returnPolicyVersion'],
                  },
                  idempotencyKey: { type: 'string' },
                },
                required: ['cartId', 'recipient', 'paymentMethod', 'consent'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order placed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '200': {
            description: 'Idempotent replay: previously placed order returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '422': { description: 'Validation failed or consent refused' },
        },
      },
    },
    '/api/v1/checkout/tax-breakdown/{orderId}': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'Get Order NBR Mushak-6.3 Tax Breakdown',
        description: 'Returns authoritative NBR Mushak-6.3 VAT breakdown and rate summaries for an order.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Tax breakdown returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Ownership authorization required' },
          '404': { description: 'Order not found' },
        },
      },
    },
    '/api/v1/checkout/abandoned': {
      get: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'List Abandoned Checkouts',
        description: 'Admin lists abandoned cart sessions with filters (status, minTotalPoisha, date range) and pagination.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ABANDONED', 'NOTIFIED', 'RECOVERED', 'EXPIRED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'minTotalPoisha', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Abandoned checkouts list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/checkout/abandoned/{id}': {
      get: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Get Abandoned Checkout Details',
        description: 'Admin retrieves detailed abandoned checkout session by ID.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Abandoned checkout session details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Abandoned checkout not found' },
        },
      },
    },
    '/api/v1/checkout/abandoned/{id}/recover': {
      post: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Trigger Recovery Notification',
        description: 'Admin dispatches recovery notification (email/SMS) with optional promotional coupon.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  incentiveCouponCode: { type: 'string' },
                  channel: { type: 'string', enum: ['EMAIL', 'SMS', 'BOTH'], default: 'BOTH' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Recovery notification dispatched successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/cart/recover/{token}': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'Restore Abandoned Cart via Recovery Link',
        description: 'Restores an abandoned cart from a recovery token, performing live server-side stock and price revalidation.',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Cart restored and revalidated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '404': { description: 'Invalid recovery token or link expired' },
        },
      },
    },
    '/api/v1/checkout/payment-methods': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'Discover Payment Methods (Query Params)',
        description: 'Discovers available payment methods (bKash, Nagad, SSLCommerz, COD, Customer Wallet) and fee breakdowns based on order total and platform.',
        parameters: [
          { name: 'orderTotalPoisha', in: 'query', schema: { type: 'integer' } },
          { name: 'cartId', in: 'query', schema: { type: 'string' } },
          { name: 'clientPlatform', in: 'query', schema: { type: 'string', enum: ['WEB', 'ANDROID', 'IOS', 'FLUTTER'], default: 'WEB' } },
        ],
        responses: {
          '200': {
            description: 'Available payment methods and recommendations',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Discover Payment Methods (JSON Payload)',
        description: 'Discovers available payment methods based on comprehensive checkout context (including address and digital goods).',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderTotalPoisha: { type: 'integer' },
                  cartId: { type: 'string' },
                  shippingAddress: {
                    type: 'object',
                    properties: {
                      division: { type: 'string' },
                      district: { type: 'string' },
                      upazila: { type: 'string' },
                      recipientPhone: { type: 'string' },
                    },
                  },
                  hasDigitalItems: { type: 'boolean', default: false },
                  clientPlatform: { type: 'string', enum: ['WEB', 'ANDROID', 'IOS', 'FLUTTER'], default: 'WEB' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Available payment methods and recommendations',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/checkout/payment-methods/select': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Select Payment Method for Checkout',
        description: 'Validates payment method selection, computes processing fees, and returns gateway redirect URL or doorstep instructions.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  paymentMethod: { type: 'string', enum: ['BKASH', 'NAGAD', 'UPAY', 'ROCKET', 'SSLCOMMERZ', 'COD', 'CUSTOMER_WALLET'] },
                  cartId: { type: 'string' },
                  orderId: { type: 'string' },
                  codVerificationToken: { type: 'string' },
                  walletType: { type: 'string', enum: ['MAIN', 'SHOPPING'], default: 'MAIN' },
                  clientReturnUrl: { type: 'string' },
                },
                required: ['paymentMethod'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Payment method selected successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Invalid payment method or validation error' },
        },
      },
    },
    '/api/v1/checkout/cod/evaluate': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Evaluate Cash on Delivery (COD) Eligibility & Risk',
        description: 'Evaluates multi-factor COD fraud risk (RTO rate, order velocity, value ceilings, and blacklists) and determines if SMS OTP or digital prepayment is required.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  recipientPhone: { type: 'string' },
                  orderSubtotalPoisha: { type: 'integer' },
                  division: { type: 'string' },
                  district: { type: 'string' },
                  upazila: { type: 'string' },
                  hasDigitalItems: { type: 'boolean', default: false },
                  cartId: { type: 'string' },
                },
                required: ['recipientPhone', 'orderSubtotalPoisha', 'division', 'district'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'COD eligibility and risk evaluation returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/checkout/cod/send-otp': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Send COD Verification SMS OTP',
        description: 'Dispatches a 6-digit numeric SMS verification OTP code to the recipient phone number.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { recipientPhone: { type: 'string' } },
                required: ['recipientPhone'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification code sent successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Invalid phone number format' },
          '429': { description: 'Cooldown period active' },
        },
      },
    },
    '/api/v1/checkout/cod/verify-otp': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Verify COD Phone SMS OTP',
        description: 'Verifies recipient phone OTP and issues single-use checkout verification token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  recipientPhone: { type: 'string' },
                  otp: { type: 'string', example: '482915' },
                },
                required: ['recipientPhone', 'otp'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Phone verified successfully; single-use token issued',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Invalid or expired OTP' },
        },
      },
    },
    '/api/v1/admin/checkout/cod/policy': {
      get: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Get COD Risk Policy Thresholds',
        description: 'Admin retrieves current COD policy limits (hard ceiling, OTP threshold, max pending orders).',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'COD policy configuration',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
      put: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Update COD Risk Policy Thresholds',
        description: 'Admin updates versioned COD limits and risk policy configuration.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  maxCodOrderValuePoisha: { type: 'integer' },
                  otpThresholdPoisha: { type: 'integer' },
                  maxActivePendingCodOrders: { type: 'integer' },
                  maxAllowedRtoRatePercent: { type: 'integer' },
                  isPhoneVerificationRequiredForNewUsers: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'COD policy updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/admin/checkout/cod/blacklist': {
      get: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'List Fraud Blacklisted Identifiers',
        description: 'Admin lists blacklisted phone numbers, emails, and IPs.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['PHONE', 'EMAIL', 'IP_ADDRESS', 'DEVICE_FINGERPRINT'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Blacklist entries list',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
      post: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Add Identifier to Fraud Blacklist',
        description: 'Admin adds or updates an identifier on the fraud blacklist.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['PHONE', 'EMAIL', 'IP_ADDRESS', 'DEVICE_FINGERPRINT'] },
                  identifier: { type: 'string' },
                  reason: { type: 'string' },
                  severity: { type: 'string', enum: ['BLOCK', 'OTP_REQUIRED', 'FLAG'], default: 'BLOCK' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
                required: ['type', 'identifier', 'reason'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Blacklist entry created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
      delete: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Remove Identifier from Fraud Blacklist',
        description: 'Admin removes an identifier from the fraud blacklist.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'identifier', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Blacklist entry removed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/shipping/serviceability': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Check Address Delivery Serviceability',
        description: 'Evaluates delivery serviceability, courier options, shipping fees, delivery timelines, and Cash on Delivery (COD) eligibility for a Bangladesh address.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  division: { type: 'string', enum: ['DHAKA', 'CHITTAGONG', 'RAJSHAHI', 'KHULNA', 'BARISAL', 'SYLHET', 'RANGPUR', 'MYMENSINGH'] },
                  district: { type: 'string' },
                  upazila: { type: 'string' },
                  postalCode: { type: 'string' },
                  address: { type: 'string' },
                  orderSubtotalPoisha: { type: 'integer' },
                  isB2B: { type: 'boolean' },
                },
                required: ['division', 'district', 'address'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Delivery serviceability evaluated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Validation failed on address fields' },
        },
      },
    },
    '/api/v1/shipping/geo/divisions': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'List Bangladesh Divisions',
        description: 'Retrieves the 8 official administrative divisions of Bangladesh with English and Bengali metadata.',
        responses: {
          '200': {
            description: 'Divisions list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/shipping/geo/districts': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'List Bangladesh Districts',
        description: 'Retrieves Bangladesh districts, optionally filtered by administrative division.',
        parameters: [
          { name: 'divisionCode', in: 'query', schema: { type: 'string', enum: ['DHAKA', 'CHITTAGONG', 'RAJSHAHI', 'KHULNA', 'BARISAL', 'SYLHET', 'RANGPUR', 'MYMENSINGH'] } },
        ],
        responses: {
          '200': {
            description: 'Districts list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/shipping/geo/upazilas': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'List Bangladesh Upazilas & Thanas',
        description: 'Retrieves upazilas and thanas, optionally filtered by district ID or district name.',
        parameters: [
          { name: 'districtId', in: 'query', schema: { type: 'string' } },
          { name: 'districtName', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Upazilas list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/shipping/rates/quote': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Calculate Multi-Vendor Shipping Rates & Promises',
        description: 'Calculates authoritative multi-vendor shipping rate quotes, package weight tiers, free delivery qualifications, and delivery promise windows in Asia/Dhaka.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  address: {
                    type: 'object',
                    properties: {
                      division: { type: 'string' },
                      district: { type: 'string' },
                      upazila: { type: 'string' },
                      postalCode: { type: 'string' },
                      streetAddress: { type: 'string' },
                    },
                    required: ['division', 'district'],
                  },
                  cartId: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        variantId: { type: 'string' },
                        productTitle: { type: 'string' },
                        quantity: { type: 'integer' },
                        weightGrams: { type: 'integer' },
                        lengthMm: { type: 'integer' },
                        widthMm: { type: 'integer' },
                        heightMm: { type: 'integer' },
                        shippingClass: { type: 'string' },
                        unitPricePoisha: { type: 'integer' },
                        sellerId: { type: 'string' },
                      },
                      required: ['variantId', 'productTitle', 'quantity', 'unitPricePoisha', 'sellerId'],
                    },
                  },
                  shippingMethod: { type: 'string', enum: ['STANDARD', 'EXPRESS', 'SAME_DAY', 'NEXT_DAY', 'HEAVY_FREIGHT'], default: 'STANDARD' },
                },
                required: ['address'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Multi-vendor shipping quote and delivery promises returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Validation failed on address or items' },
        },
      },
    },
    '/api/v1/shipping/promise': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Evaluate Delivery Promise Timeline',
        description: 'Evaluates delivery promise timeline, business calendar boundaries (excluding Friday), and daily order cutoff times in Asia/Dhaka.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  destinationDivision: { type: 'string' },
                  destinationDistrict: { type: 'string' },
                  destinationUpazila: { type: 'string' },
                  originDivision: { type: 'string', default: 'DHAKA' },
                  originDistrict: { type: 'string', default: 'Dhaka' },
                  sellerId: { type: 'string' },
                  shippingMethod: { type: 'string', enum: ['STANDARD', 'EXPRESS', 'SAME_DAY', 'NEXT_DAY', 'HEAVY_FREIGHT'], default: 'STANDARD' },
                  asOfDate: { type: 'string', format: 'date-time' },
                },
                required: ['destinationDivision', 'destinationDistrict'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Delivery promise snapshot evaluated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Validation failed on input parameters' },
        },
      },
    },
    '/api/v1/shipping/couriers': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'List Registered Bangladesh Couriers',
        description: 'Lists all registered Bangladesh couriers (Pathao, Steadfast, RedX, Paperfly, In-House), supported zones, and COD limits.',
        responses: {
          '200': {
            description: 'Couriers list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/shipping/consignments': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'List Scoped Consignments & Shipments',
        description: 'Lists parcel shipments and courier consignments scoped to the caller tenant.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'courierProvider', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Shipments list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
        },
      },
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Create Courier Consignment & Dispatch Shipment',
        description: 'Dispatches a fulfillment package to a Bangladesh courier, normalizes recipient phone to +880, and generates tracking credentials.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fulfillmentGroupId: { type: 'string' },
                  courierProvider: { type: 'string', enum: ['PATHAO', 'STEADFAST', 'REDX', 'PAPERFLY', 'IN_HOUSE'] },
                  recipientName: { type: 'string' },
                  recipientPhone: { type: 'string' },
                  deliveryAddress: { type: 'string' },
                  division: { type: 'string' },
                  district: { type: 'string' },
                  upazila: { type: 'string' },
                  itemDescription: { type: 'string' },
                  totalWeightGrams: { type: 'integer', default: 500 },
                  codAmountPoisha: { type: 'integer', default: 0 },
                  isPrepaid: { type: 'boolean', default: false },
                },
                required: ['fulfillmentGroupId', 'courierProvider', 'recipientName', 'recipientPhone', 'deliveryAddress', 'division', 'district'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Consignment created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/shipping/consignments/{consignmentId}/cancel': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Cancel Courier Consignment',
        description: 'Cancels an unpicked courier consignment before pickup.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'consignmentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { reason: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Consignment cancelled successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '404': { description: 'Consignment not found' },
        },
      },
    },
    '/api/v1/shipping/track/{trackingNumber}': {
      get: {
        tags: ['Checkout & Shipping'],
        summary: 'Track Shipment Package Timeline',
        description: 'Public tracking endpoint returning chronological logistics events with customer PII phone masking.',
        parameters: [{ name: 'trackingNumber', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Tracking timeline returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '404': { description: 'Shipment not found' },
        },
      },
    },
    '/api/v1/shipping/in-house/verify-delivery': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Verify In-House Doorstep Delivery via OTP',
        description: 'Verifies customer doorstep delivery using a secure 6-digit OTP code.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  shipmentId: { type: 'string' },
                  otpCode: { type: 'string' },
                  riderId: { type: 'string' },
                  deliveryNotes: { type: 'string' },
                  recipientSignedName: { type: 'string' },
                  proofOfDeliveryPhotoUrl: { type: 'string' },
                },
                required: ['shipmentId', 'otpCode', 'riderId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Doorstep delivery confirmed and verified',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '422': { description: 'Invalid OTP code' },
        },
      },
    },
    '/api/v1/shipping/webhooks/{courier}': {
      post: {
        tags: ['Checkout & Shipping'],
        summary: 'Ingest Courier Status Webhook Callback',
        description: 'Receives and processes asynchronous webhook callbacks from courier partners (Pathao, Steadfast, RedX, Paperfly).',
        parameters: [{ name: 'courier', in: 'path', required: true, schema: { type: 'string', enum: ['pathao', 'steadfast', 'redx', 'paperfly'] } }],
        responses: {
          '200': {
            description: 'Webhook processed successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '422': { description: 'Invalid webhook payload or courier' },
        },
      },
    },
    '/api/v1/admin/shipping/rules': {
      get: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'List Versioned Shipping Rate Rules',
        description: 'Admin lists shipping rate rules with pagination and filters.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] } },
          { name: 'shippingMethod', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Shipping rate rules list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
        },
      },
      post: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Create Versioned Shipping Rate Rule',
        description: 'Admin creates a new versioned shipping rate rule with zone matrix, weight brackets, and delivery promises.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  nameBn: { type: 'string' },
                  description: { type: 'string' },
                  shippingMethod: { type: 'string', enum: ['STANDARD', 'EXPRESS', 'SAME_DAY', 'NEXT_DAY', 'HEAVY_FREIGHT'], default: 'STANDARD' },
                  originZone: { type: 'string', default: 'ANY' },
                  destinationZone: { type: 'string', default: 'ANY' },
                  sellerId: { type: 'string' },
                  courierProvider: { type: 'string' },
                  baseRatePoisha: { type: 'integer' },
                  baseWeightGrams: { type: 'integer', default: 1000 },
                  incrementalWeightGrams: { type: 'integer', default: 1000 },
                  incrementalRatePoisha: { type: 'integer', default: 2000 },
                  freeShippingThresholdPoisha: { type: 'integer' },
                  handlingDays: { type: 'integer', default: 1 },
                  transitDaysMin: { type: 'integer', default: 1 },
                  transitDaysMax: { type: 'integer', default: 3 },
                  cutoffTime: { type: 'string', default: '14:00' },
                  isCodAllowed: { type: 'boolean', default: true },
                  maxCodAmountPoisha: { type: 'integer', default: 5000000 },
                  priority: { type: 'integer', default: 0 },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
                  ruleVersion: { type: 'string', default: 'v1.0.0' },
                },
                required: ['code', 'name', 'baseRatePoisha'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Shipping rate rule created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/admin/shipping/rules/{id}': {
      get: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Get Shipping Rate Rule Details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Shipping rate rule details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Rule not found' },
        },
      },
      patch: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Update Shipping Rate Rule',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Shipping rate rule updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Rule not found' },
        },
      },
      delete: {
        tags: ['Admin', 'Checkout & Shipping'],
        summary: 'Soft Delete Shipping Rate Rule',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Shipping rate rule archived successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Rule not found' },
        },
      },
    },
    '/api/v1/orders': {
      get: {
        tags: ['Order'],
        summary: 'List Scoped Orders',
        description: 'Returns orders scoped to caller: customers view their own orders; merchants view their fulfillment groups; admins view all orders.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Scoped orders list',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
        },
      },
      post: {
        tags: ['Order'],
        summary: 'Create Customer Order (Checkout)',
        description: 'Executes checkout from an active cart, partitioning items into seller fulfillment groups with exact poisha pricing and independent Product Points snapshotting.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string', example: 'crt_1j7x4b9e8m02k3f8d7c6b5a4' },
                  shippingName: { type: 'string', example: 'Tanvir Ahmed' },
                  shippingPhone: { type: 'string', example: '+8801700112233' },
                  shippingDivision: { type: 'string', enum: ['DHAKA', 'CHITTAGONG', 'RAJSHAHI', 'KHULNA', 'BARISAL', 'SYLHET', 'RANGPUR', 'MYMENSINGH'] },
                  shippingDistrict: { type: 'string', example: 'Dhaka' },
                  shippingAddress: { type: 'string', example: 'House 42, Road 11, Gulshan-2' },
                },
                required: ['cartId', 'shippingName', 'shippingPhone', 'shippingDivision', 'shippingDistrict', 'shippingAddress'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/orders/{orderNumber}': {
      get: {
        tags: ['Order'],
        summary: 'Get Order Details & Shipment Tracking',
        description: 'Returns complete customer parent order details with seller fulfillment groups, courier tracking numbers, and shipment timelines.',
        parameters: [
          {
            name: 'orderNumber',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ORD-20260922-0001' },
          },
        ],
        responses: {
          '200': {
            description: 'Order details and shipment tracking retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Order', 'Customer & Ownership'],
        summary: 'Get Order by ID with Object-Level Authorization',
        description: 'Returns order details if caller is the owning customer, fulfilling merchant, assigned rider, or platform administrator.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ord_12345' },
          },
        ],
        responses: {
          '200': {
            description: 'Order details retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Ownership or tenant violation' },
          '404': { description: 'Order not found' },
        },
      },
    },
    '/api/v1/orders/{id}/cancel': {
      post: {
        tags: ['Order', 'Customer & Ownership'],
        summary: 'Cancel Order (Self-Service Ownership & Status Invariant)',
        description: 'Allows a customer to cancel their own order only while in eligible pending states (PENDING, PLACED, PAYMENT_PENDING).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ord_12345' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Accidentally placed duplicate order' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Order cancelled successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Ownership violation or non-cancellable status' },
          '404': { description: 'Order not found' },
        },
      },
    },
    '/api/v1/seller/orders': {
      get: {
        tags: ['Order', 'Seller Fulfillment'],
        summary: 'List Seller Fulfillment Groups',
        description: 'Multi-tenant scoped query returning fulfillment groups and packing items exclusively belonging to the authenticated merchant. Supports status, date range, and pagination filters.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by fulfillment group status' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': {
            description: 'List of seller fulfillment groups',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '403': { description: 'Seller authority required' },
        },
      },
    },
    '/api/v1/seller/orders/{groupId}': {
      get: {
        tags: ['Order', 'Seller Fulfillment'],
        summary: 'Get Seller Fulfillment Order Detail',
        description: 'Retrieves single fulfillment order with strict query-level tenant scoping. Cross-tenant access returns 403 TENANT_VIOLATION. Phone numbers are masked. Commission and payout are read-only.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'Fulfillment group ID or group number' },
        ],
        responses: {
          '200': {
            description: 'Seller fulfillment order details with financial breakdown, masked delivery contact, and logistics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '403': { description: 'Tenant violation — fulfillment group belongs to another seller' },
          '404': { description: 'Fulfillment order not found' },
        },
      },
    },
    '/api/v1/seller/orders/{groupId}/status': {
      patch: {
        tags: ['Order'],
        summary: 'Transition Fulfillment Group Status',
        description: 'Advances fulfillment group along state machine (ACCEPTED, PACKING, READY_FOR_PICKUP, HANDED_OVER_TO_COURIER) with strict tenant verification.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'groupId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'sfg_1j7x4b9e8m02k3f8d7c6b5a4' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ACCEPTED', 'PACKING', 'READY_FOR_PICKUP', 'HANDED_OVER_TO_COURIER'] },
                  reason: { type: 'string' },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Status advanced successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/fulfillment-groups': {
      get: {
        tags: ['Seller Fulfillment', 'Checkout & Shipping'],
        summary: 'List Merchant Scoped Fulfillment Groups',
        description: 'Multi-tenant scoped query returning fulfillment groups belonging exclusively to the authenticated merchant with query-level sellerId enforcement.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'PACKING', 'READY_FOR_PICKUP', 'HANDED_OVER_TO_COURIER', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REJECTED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'List of seller fulfillment groups returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Tenant access violation' },
        },
      },
    },
    '/api/v1/seller/fulfillment-groups/{id}': {
      get: {
        tags: ['Seller Fulfillment', 'Checkout & Shipping'],
        summary: 'Get Seller Fulfillment Group Details',
        description: 'Retrieves single fulfillment group details with strict sellerId query-level scoping.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Fulfillment group details returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Tenant access violation' },
          '404': { description: 'Fulfillment group not found' },
        },
      },
    },
    '/api/v1/seller/fulfillment-groups/{id}/status': {
      patch: {
        tags: ['Seller Fulfillment', 'Checkout & Shipping'],
        summary: 'Transition Fulfillment Group Lifecycle Status',
        description: 'Transitions fulfillment group along state machine (ACCEPTED, PACKING, READY_FOR_PICKUP, CANCELLED, REJECTED) within merchant tenant boundaries.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ACCEPTED', 'PACKING', 'READY_FOR_PICKUP', 'CANCELLED', 'REJECTED'] },
                  reason: { type: 'string' },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Status transitioned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Tenant access violation' },
          '409': { description: 'Invalid status transition' },
        },
      },
    },
    '/api/v1/seller/fulfillment-groups/{id}/dispatch': {
      post: {
        tags: ['Seller Fulfillment', 'Checkout & Shipping'],
        summary: 'Dispatch Fulfillment Group to Courier',
        description: 'Creates a consignment with chosen courier (Pathao, Steadfast, RedX, Paperfly, In-House) and advances status to HANDED_OVER_TO_COURIER.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  courierProvider: { type: 'string', enum: ['PATHAO', 'STEADFAST', 'REDX', 'PAPERFLY', 'IN_HOUSE'] },
                  weightGrams: { type: 'integer' },
                  specialInstructions: { type: 'string' },
                },
                required: ['courierProvider'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Dispatched to courier successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Tenant access violation' },
        },
      },
    },
    '/api/v1/seller/fulfillment-groups/{id}/manifest': {
      get: {
        tags: ['Seller Fulfillment', 'Checkout & Shipping'],
        summary: 'Get Warehouse Packing Slip & Manifest',
        description: 'Retrieves printable packing slip and parcel manifest data for merchant warehouse operations.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Packing slip manifest returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Tenant access violation' },
        },
      },
    },
    '/api/v1/admin/fulfillment-groups': {
      get: {
        tags: ['Admin', 'Seller Fulfillment'],
        summary: 'List All Fulfillment Groups Across Sellers',
        description: 'Platform administrator lists fulfillment groups across all merchant tenants with filtering and pagination.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'sellerId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Fulfillment groups list returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin authority required' },
        },
      },
    },
    '/api/v1/admin/fulfillment-groups/{id}': {
      get: {
        tags: ['Admin', 'Seller Fulfillment'],
        summary: 'Admin Inspect Fulfillment Group',
        description: 'Platform administrator retrieves single fulfillment group details across any merchant tenant.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Fulfillment group details returned successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Admin authority required' },
          '404': { description: 'Fulfillment group not found' },
        },
      },
    },
    '/api/v1/payments': {
      post: {
        tags: ['Payments & Settlements'],
        summary: 'Initiate Customer Payment Transaction',
        description: 'Creates a pending payment transaction record for digital gateway authorization (bKash, Nagad, etc.) with exact poisha precision.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
                  gatewayProvider: { type: 'string', enum: ['BKASH', 'NAGAD', 'UPAY', 'ROCKET', 'SSLCOMMERZ', 'COD'] },
                  amountPoisha: { type: 'string', example: '2534850' },
                  currency: { type: 'string', default: 'BDT' },
                  idempotencyKey: { type: 'string', example: 'idemp-pay-001' },
                },
                required: ['orderId', 'gatewayProvider', 'amountPoisha'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment initiated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Payments & Settlements'],
        summary: 'List Customer Payments',
        description: 'Retrieves payment history for the authenticated customer or seller.',
        responses: {
          '200': {
            description: 'Payments retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/payments/webhooks/{provider}': {
      post: {
        tags: ['Payments & Settlements'],
        summary: 'Inward Payment Gateway Webhook Callback',
        description: 'Receives and cryptographically verifies provider IPN events using HMAC SHA-256 signatures with replay deduplication.',
        parameters: [
          {
            name: 'provider',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['bkash', 'nagad', 'sslcommerz'] },
          },
        ],
        responses: {
          '200': {
            description: 'Webhook processed or deduplicated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/refunds': {
      post: {
        tags: ['Payments & Settlements'],
        summary: 'Initiate Item-Level Partial Refund',
        description: 'Processes a partial or full refund with explicit Product Points rollback, commission adjustments, and ceiling checks.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  paymentId: { type: 'string', example: 'pay_01j7x4b9e8m02k3f8d7c6b5a1' },
                  orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
                  amountPoisha: { type: 'string', example: '2199000' },
                  reason: { type: 'string', enum: ['DAMAGED_GOODS', 'DEFECTIVE', 'OUT_OF_STOCK', 'CUSTOMER_CANCEL', 'FRAUD'] },
                  reversalPoints: { type: 'integer', example: 450 },
                },
                required: ['paymentId', 'orderId', 'amountPoisha', 'reason'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Refund initiated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/profile': {
      get: {
        tags: ['Seller Portal'],
        summary: 'Get Authenticated Seller Profile',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'query', required: false, schema: { type: 'string' } }],
        responses: { '200': { description: 'Seller profile retrieved' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/seller/settings': {
      get: {
        tags: ['Seller Portal'],
        summary: 'Get Seller Store Settings',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'query', required: false, schema: { type: 'string' } }],
        responses: { '200': { description: 'Store settings retrieved' }, '403': { description: 'Tenant violation' } },
      },
      put: {
        tags: ['Seller Portal'],
        summary: 'Update Seller Store Settings',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SellerStoreSettingsRequest' } } } },
        responses: { '200': { description: 'Store settings updated' }, '409': { description: 'Version conflict' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/seller/settings/branding': {
      post: {
        tags: ['Seller Portal'],
        summary: 'Upload Seller Branding Asset',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['sellerId', 'assetType', 'version', 'file'], properties: { sellerId: { type: 'string' }, assetType: { type: 'string', enum: ['LOGO', 'BANNER'] }, version: { type: 'integer', minimum: 1 }, file: { type: 'string', format: 'binary' } } } } } },
        responses: { '200': { description: 'Branding asset uploaded' }, '403': { description: 'Forbidden' }, '409': { description: 'Version conflict' }, '422': { description: 'Invalid branding asset' } },
      },
    },
    '/api/v1/stores/{slug}': {
      get: {
        tags: ['Storefront'],
        summary: 'Get Verified Public Seller Store',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Verified public seller profile retrieved' }, '404': { description: 'Store not found or not public' } },
      },
    },
    '/api/v1/seller/kyc': {
      get: {
        tags: ['Seller Portal'],
        summary: 'List Seller KYC Documents',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'query', required: false, schema: { type: 'string' } }],
        responses: { '200': { description: 'Documents listed' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } },
      },
      post: {
        tags: ['Seller Portal'],
        summary: 'Upload Private Seller KYC Document',
        description: 'Accepts multipart/form-data, validates file size, MIME type, magic signature, authenticated device identifier, and stores the object privately in S3-compatible storage.',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['sellerId', 'documentType', 'file'], properties: { sellerId: { type: 'string' }, documentType: { type: 'string', enum: ['TRADE_LICENSE', 'NID_FRONT', 'NID_BACK', 'BIN_CERTIFICATE', 'BANK_CHEQUE_LEAF', 'TIN_CERTIFICATE'] }, documentNumber: { type: 'string' }, file: { type: 'string', format: 'binary' } } } } } },
        responses: { '201': { description: 'Document uploaded' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden or cross-tenant' }, '422': { description: 'Invalid file or metadata' }, '429': { description: 'Upload rate limit exceeded' } },
      },
    },
    '/api/v1/seller/kyc/{documentId}/view': {
      get: {
        tags: ['Seller Portal'],
        summary: 'Create Short-Lived KYC View URL',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Signed URL created' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/admin/seller/kyc': {
      get: {
        tags: ['Seller Administration'],
        summary: 'List Pending Seller KYC Documents',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Review queue listed' }, '401': { description: 'Unauthorized' }, '403': { description: 'Requires sellers:verify' } },
      },
    },
    '/api/v1/admin/seller/kyc/{documentId}/review': {
      post: {
        tags: ['Seller Administration'],
        summary: 'Review Seller KYC Document',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['version', 'status'], properties: { version: { type: 'integer', minimum: 1 }, status: { type: 'string', enum: ['VERIFIED', 'REJECTED'] }, rejectionReason: { type: 'string' } } } } } },
        responses: { '200': { description: 'Document reviewed' }, '403': { description: 'Requires sellers:verify' }, '409': { description: 'Version conflict' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/seller/payout-profile': {
      get: {
        tags: ['Payments & Settlements'],
        summary: 'Get Masked Seller Payout Profile',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'query', required: false, schema: { type: 'string' } }],
        responses: { '200': { description: 'Masked payout profile retrieved' }, '403': { description: 'Tenant violation' } },
      },
      put: {
        tags: ['Payments & Settlements'],
        summary: 'Replace Seller Payout Profile',
        description: 'Stores encrypted payout references and returns only masked metadata. This does not execute a payout.',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sellerId', 'providerName', 'accountNumber', 'accountTitle', 'version'], properties: { sellerId: { type: 'string' }, providerName: { type: 'string' }, accountNumber: { type: 'string' }, routingNumber: { type: 'string' }, accountTitle: { type: 'string' }, version: { type: 'integer', minimum: 1 } } } } } },
        responses: { '200': { description: 'Masked payout profile saved' }, '403': { description: 'Forbidden' }, '409': { description: 'Version or duplicate conflict' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/seller/operational-defaults': {
      get: { tags: ['Seller Portal'], summary: 'Get Seller Operational Defaults', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Operational defaults retrieved' }, '403': { description: 'Tenant violation' } } },
      put: { tags: ['Seller Portal'], summary: 'Update Seller Operational Defaults', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sellerId', 'defaultHandlingDays', 'autoAcceptOrders', 'defaultOrderStatus', 'version'], properties: { sellerId: { type: 'string' }, taxJurisdiction: { type: 'string' }, taxRuleVersion: { type: 'string', nullable: true }, taxEffectiveFrom: { type: 'string', format: 'date-time', nullable: true }, shippingMode: { type: 'string', enum: ['PLATFORM', 'SELLER_DEFAULT', 'DISABLED'] }, defaultHandlingDays: { type: 'integer', minimum: 0, maximum: 30 }, orderCutoffTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', nullable: true }, autoAcceptOrders: { type: 'boolean' }, defaultOrderStatus: { type: 'string', enum: ['PENDING'] }, version: { type: 'integer', minimum: 1 } } } } } }, responses: { '200': { description: 'Defaults updated' }, '409': { description: 'Version conflict' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/seller/notification-defaults': {
      get: { tags: ['Seller Portal'], summary: 'Get Seller Notification Defaults', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Notification defaults retrieved' } } },
      put: { tags: ['Seller Portal'], summary: 'Update Seller Notification Defaults', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sellerId', 'preferences'], properties: { sellerId: { type: 'string' }, preferences: { type: 'array', items: { type: 'object', required: ['channel', 'eventType', 'enabled'], properties: { channel: { type: 'string', enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'] }, eventType: { type: 'string', enum: ['SECURITY', 'TRANSACTIONAL', 'MARKETING'] }, enabled: { type: 'boolean' } } } } } } } } }, responses: { '200': { description: 'Notification defaults updated' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/admin/sellers/{id}/lifecycle': {
      post: { tags: ['Seller Administration'], summary: 'Update Seller Suspension or Reactivation State', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['action', 'version', 'reason'], properties: { action: { type: 'string', enum: ['RESTRICT', 'SUSPEND', 'REACTIVATE'] }, version: { type: 'integer', minimum: 1 }, reason: { type: 'string', minLength: 5, maxLength: 1000 } } } } } }, responses: { '200': { description: 'Seller lifecycle state updated' }, '403': { description: 'Requires seller administration permission' }, '409': { description: 'State or version conflict' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/seller/settlements': {
      get: {
        tags: ['Payments & Settlements'],
        summary: 'List Merchant Settlement Statement Batches',
        description: 'Returns tenant-isolated periodic settlement batches for the authenticated seller.',
        responses: {
          '200': {
            description: 'Settlement batches retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/payouts': {
      get: {
        tags: ['Payments & Settlements'],
        summary: 'List Merchant Electronic Payouts',
        description: 'Returns historical electronic funds transfers (BEFTN, RTGS, bKash) disbursed to the seller bank account.',
        responses: {
          '200': {
            description: 'Payout records retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/staff/activity': {
      get: {
        tags: ['Seller Portal'],
        summary: 'List Seller Staff Activity',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'sellerId', in: 'query', required: false, schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }],
        responses: { '200': { description: 'Staff activity listed' }, '403': { description: 'Cross-tenant access denied' } },
      },
    },
    '/api/v1/seller/staff': {
      get: {
        tags: ['Seller Portal'],
        summary: 'List Store Staff Members',
        description: 'Returns all active staff members with assigned roles and permissions for a merchant store. Strictly tenant-isolated.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'sellerId',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
            description: 'Optional store identifier (required for Super Admin bypass)',
          },
        ],
        responses: {
          '200': {
            description: 'Staff members retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Cross-tenant access violation' },
        },
      },
      post: {
        tags: ['Seller Portal'],
        summary: 'Add or Invite Store Staff Member',
        description: 'Adds an existing user or invites a new person via email/phone as a store staff or manager. Assigns scoped role in IAM and emits outbox event.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                  userId: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
                  email: { type: 'string', example: 'staff@store.com' },
                  phone: { type: 'string', example: '+8801712345678' },
                  name: { type: 'string', example: 'Staff Name' },
                  roleCode: { type: 'string', example: 'SELLER_STAFF' },
                  permissions: { type: 'array', items: { type: 'string' } },
                },
                required: ['sellerId'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Staff member added successfully' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Cross-tenant or lacking permissions' },
          '422': { description: 'Validation failed' },
        },
      },
      delete: {
        tags: ['Seller Portal'],
        summary: 'Remove Store Staff Member',
        description: 'Removes a staff member from the merchant store and revokes their scoped IAM role assignment.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                  userId: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
                },
                required: ['sellerId', 'userId'],
              },
            },
          },
        },
        parameters: [
          {
            name: 'sellerId',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
          },
          {
            name: 'userId',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
          },
        ],
        responses: {
          '200': { description: 'Staff member removed successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/seller/staff/invite': {
      post: {
        tags: ['Seller Portal'],
        summary: 'Invite Store Staff Member via Email',
        description: 'Invites a user by email to join the merchant store staff with specified permissions.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                  email: { type: 'string', example: 'staff@store.com' },
                  name: { type: 'string', example: 'Staff Member' },
                  phone: { type: 'string', example: '+8801712345678' },
                  roleCode: { type: 'string', enum: ['SELLER_STAFF', 'SELLER_MANAGER'], default: 'SELLER_STAFF' },
                  permissions: { type: 'array', items: { type: 'string' } },
                },
                required: ['sellerId', 'email', 'name'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Staff invitation created successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/seller/application': {
      get: {
        tags: ['Seller Portal'],
        summary: 'Get Current Seller Application',
        description: 'Returns the authenticated applicant\'s current seller application without accepting a client-supplied owner identifier.',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Application retrieved' }, '401': { description: 'Unauthorized' } },
      },
      post: {
        tags: ['Seller Portal'],
        summary: 'Create Seller Application Draft',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SellerApplicationDraft' } } } },
        responses: { '201': { description: 'Draft created' }, '401': { description: 'Unauthorized' }, '409': { description: 'Active application already exists' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/seller/application/{id}': {
      get: {
        tags: ['Seller Portal'],
        summary: 'Get Owned Seller Application',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Application retrieved' }, '404': { description: 'Not found' }, '403': { description: 'Forbidden' } },
      },
      patch: {
        tags: ['Seller Portal'],
        summary: 'Update Owned Seller Application Draft',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SellerApplicationDraft' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }] } } } },
        responses: { '200': { description: 'Draft updated' }, '409': { description: 'Version or state conflict' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/seller/application/{id}/submit': {
      post: {
        tags: ['Seller Portal'],
        summary: 'Submit Seller Application',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } } } } },
        responses: { '200': { description: 'Application submitted' }, '409': { description: 'Version or state conflict' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/admin/seller-applications': {
      get: {
        tags: ['Seller Administration'],
        summary: 'List Seller Applications',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { description: 'Applications listed' }, '401': { description: 'Unauthorized' }, '403': { description: 'Requires sellers:verify' } },
      },
    },
    '/api/v1/admin/seller-applications/{id}': {
      get: {
        tags: ['Seller Administration'],
        summary: 'Get Seller Application Review Details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^sapp_[A-Za-z0-9]+$' } }],
        responses: { '200': { description: 'Application details and review history retrieved' }, '403': { description: 'Requires sellers:verify' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/admin/seller-applications/{id}/review': {
      post: {
        tags: ['Seller Administration'],
        summary: 'Review Seller Application',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string', minLength: 8, maxLength: 128 } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['version', 'decision'], properties: { version: { type: 'integer', minimum: 1 }, decision: { type: 'string', enum: ['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'] }, reason: { type: 'string', minLength: 5 } } } } } },
        responses: { '200': { description: 'Application reviewed' }, '403': { description: 'Requires sellers:verify' }, '409': { description: 'Version or state conflict' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/support/tickets': {
      get: {
        tags: ['Customer Support'],
        summary: 'List Support Tickets',
        description: 'Returns support tickets scoped to caller: customers see their own, merchants see their store issues, and support agents see the queue.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tickets retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Customer Support'],
        summary: 'Create Customer Support Ticket',
        description: 'Opens a new incident or inquiry ticket for an authenticated customer or seller.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', example: 'Damaged item received' },
                  description: { type: 'string', example: 'The box was torn and contents were broken.' },
                  category: { type: 'string', enum: ['ORDER_INQUIRY', 'DELIVERY_DELAY', 'PAYMENT_ISSUE', 'REFUND_REQUEST', 'PRODUCT_DEFECT', 'ACCOUNT_SECURITY', 'SELLER_ONBOARDING', 'GENERAL_INQUIRY'], default: 'ORDER_INQUIRY' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
                  orderId: { type: 'string', example: 'ord_1j7x4b9e8m02k3f8' },
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                },
                required: ['subject', 'description'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Ticket created successfully' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/support/tickets/{id}': {
      get: {
        tags: ['Customer Support'],
        summary: 'Get Support Ticket Details',
        description: 'Retrieves complete ticket message thread and status. Enforces ownership and support authorization.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'tkt_12345' },
          },
        ],
        responses: {
          '200': { description: 'Ticket details retrieved' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Ownership violation' },
          '404': { description: 'Ticket not found' },
        },
      },
      post: {
        tags: ['Customer Support'],
        summary: 'Reply to Support Ticket',
        description: 'Appends a response message from the ticket owner or assigned support agent.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'tkt_12345' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'We have dispatched your replacement.' },
                },
                required: ['message'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reply posted successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '422': { description: 'Validation failed' },
        },
      },
      patch: {
        tags: ['Customer Support'],
        summary: 'Resolve Support Ticket',
        description: 'Closes or resolves a support ticket.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'tkt_12345' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  resolutionNote: { type: 'string', example: 'Replacement issued and customer satisfied.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Ticket marked resolved' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/v1/rider/assignments': {
      post: {
        tags: ['Logistics & Delivery'],
        summary: 'Accept Delivery Assignment',
        description: 'Atomically claims an available shipment assignment using lease verification to prevent double-assignment.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  deliveryId: { type: 'string', example: 'shp_1j7x4b9e8m02k3f8' },
                  leaseToken: { type: 'string', example: 'lse_12345' },
                },
                required: ['deliveryId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Assignment claimed successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Double-assignment or lacking rider role' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/rider/location': {
      post: {
        tags: ['Logistics & Delivery'],
        summary: 'Publish Live Rider GPS Location',
        description: 'Ingests live coordinates from mobile rider app. Compact JSON, throttled in cache.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  deliveryId: { type: 'string', example: 'shp_1j7x4b9e8m02k3f8' },
                  latitude: { type: 'number', example: 23.8103 },
                  longitude: { type: 'number', example: 90.4125 },
                  speed: { type: 'number', example: 28.5 },
                  heading: { type: 'number', example: 180.0 },
                },
                required: ['latitude', 'longitude'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Location recorded successfully' },
          '401': { description: 'Unauthorized' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/wallets': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'List Multi-Account User Wallets',
        description: 'Returns segregated balances for Main, Shopping, Good-Luck, and Charity wallets in integer minor unit poisha.',
        responses: {
          '200': {
            description: 'Wallets retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/points': {
      get: {
        tags: ['Product Points'],
        summary: 'Get Decoupled Product Points Balance',
        description: 'Retrieves available, pending escrow, and lifetime Product Points with chronological event stream.',
        responses: {
          '200': {
            description: 'Point account retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ranks': {
      get: {
        tags: ['Product Points'],
        summary: 'Get Customer Club Rank & Star Bands',
        description: 'Returns customer qualification progress across Bronze, Silver, Gold tiers and competitive Star bands.',
        responses: {
          '200': {
            description: 'Rank status retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/admin/ledger/journals': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'Audit Double-Entry Journal Transactions',
        description: 'Queries balanced double-entry journals with debit and credit breakdown conserving zero-sum accounting.',
        responses: {
          '200': {
            description: 'Journals retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/database/dictionary': {
      get: {
        tags: ['Database & Migrations'],
        summary: 'Database Data Dictionary Discovery',
        description: 'Returns the catalog of all 49 canonical relational Prisma models classified by lifecycle deletion policy (IMMUTABLE, SOFT_DELETE, EPHEMERAL).',
        responses: {
          '200': {
            description: 'Data dictionary metadata retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DataDictionarySummary' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/database/migrations': {
      get: {
        tags: ['Database & Migrations'],
        summary: 'Migration Sequence & Zero-Downtime Status',
        description: 'Returns applied migration sequences, expand-and-contract phase health, and forward-fix audit records.',
        responses: {
          '200': {
            description: 'Migration sequence retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MigrationStatus' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/languages': {
      get: {
        tags: ['Internationalization & Localization'],
        summary: 'List Supported Platform Languages',
        description: 'Returns all registered languages with active/default status, native names, and word for language translations.',
        responses: {
          '200': {
            description: 'Languages retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Internationalization & Localization'],
        summary: 'Register New Platform Language Dynamically',
        description: 'Dynamically registers a new language code with native display names and RTL/LTR text direction.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddLanguageRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Language registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
          '409': {
            description: 'Language code already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/languages/default': {
      patch: {
        tags: ['Internationalization & Localization'],
        summary: 'Set Platform Default Language',
        description: 'Designates an active registered language code as the authoritative system-wide default locale.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetDefaultLanguageRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Default language updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/languages/{code}': {
      patch: {
        tags: ['Internationalization & Localization'],
        summary: 'Update Language Metadata or Status',
        description: 'Updates display name, native name, or toggles active status for a registered language.',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'bn' },
            description: 'Language ISO code',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateLanguageRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Language updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Internationalization & Localization'],
        summary: 'Delete or Deregister Language',
        description: 'Removes a non-default language from platform availability.',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ar' },
            description: 'Language ISO code to remove',
          },
        ],
        responses: {
          '200': {
            description: 'Language removed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
          '400': {
            description: 'Cannot remove default or sole registered language',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/iam/roles': {
      get: {
        tags: ['Identity & Access Management'],
        summary: 'List All RBAC Roles',
        description: 'Retrieves all platform and custom RBAC roles with system flags and descriptions. Requires roles:read permission.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of roles retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'rol_1j7x4b9e8m02k3f8' },
                          code: { type: 'string', example: 'SUPER_ADMIN' },
                          name: { type: 'string', example: 'Super Administrator' },
                          description: { type: 'string', example: 'Platform owner with unrestricted access' },
                          isSystem: { type: 'boolean', example: true },
                          version: { type: 'number', example: 1 },
                        },
                      },
                    },
                    meta: {
                      type: 'object',
                      properties: { total: { type: 'number', example: 7 } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Insufficient privileges',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/iam/roles/assign': {
      post: {
        tags: ['Identity & Access Management'],
        summary: 'Assign Role to User',
        description: 'Assigns an RBAC role to a user. Seller-scoped roles require sellerId. Enforces maker privileges. Requires roles:assign permission.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
                  roleId: { type: 'string', example: 'rol_1j7x4b9e8m02k3f8' },
                  sellerId: { type: 'string', nullable: true, example: 'sel_1j7x4b9e8m02k3f8' },
                },
                required: ['userId', 'roleId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Role assigned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { message: { type: 'string', example: 'Role assigned successfully' } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Cannot assign role without requisite privileges',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '422': {
            description: 'Validation error: Missing sellerId for seller role or invalid ID',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/iam/roles/revoke': {
      post: {
        tags: ['Identity & Access Management'],
        summary: 'Revoke Role from User',
        description: 'Revokes a user role assignment. Requires roles:assign permission or SELLER_OWNER for own staff.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  assignmentId: { type: 'string', nullable: true, example: 'ura_1j7x4b9e8m02k3f8' },
                  userId: { type: 'string', nullable: true, example: 'usr_1j7x4b9e8m02k3f8' },
                  roleId: { type: 'string', nullable: true, example: 'rol_1j7x4b9e8m02k3f8' },
                  sellerId: { type: 'string', nullable: true, example: 'sel_1j7x4b9e8m02k3f8' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Role revoked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { message: { type: 'string', example: 'Role revoked successfully' } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Insufficient privileges to revoke role',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/iam/permissions': {
      get: {
        tags: ['Identity & Access Management'],
        summary: 'List All Permissions',
        description: 'Retrieves all granular permissions grouped by functional module (IAM, SELLER, CATALOG, ORDER, FINANCE, SYSTEM). Requires permissions:read.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Permissions list retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        permissions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'prm_1j7x4b9e8m02k3f8' },
                              code: { type: 'string', example: 'users:read' },
                              name: { type: 'string', example: 'View Users' },
                              module: { type: 'string', example: 'IAM' },
                              description: { type: 'string', example: 'View user profiles' },
                            },
                          },
                        },
                        byModule: { type: 'object' },
                      },
                    },
                    meta: {
                      type: 'object',
                      properties: { total: { type: 'number', example: 25 } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Insufficient privileges',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/admin/audit': {
      get: {
        tags: ['Audit & Compliance'],
        summary: 'Explore Historical Audit Logs',
        description: 'Returns paginated, multi-parameter filtered immutable audit log records. Strictly requires Super Administrator authority or system:audit_read permission.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'actorId', in: 'query', schema: { type: 'string' } },
          { name: 'actorRole', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'resource', in: 'query', schema: { type: 'string' } },
          { name: 'resourceId', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Audit logs retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication credentials required' },
          '403': { description: 'Forbidden: Requires system:audit_read permission' },
          '422': { description: 'Validation failed on query parameters' },
        },
      },
    },
    '/api/v1/admin/audit/{id}': {
      get: {
        tags: ['Audit & Compliance'],
        summary: 'Get Audit Log Entry by ID',
        description: 'Retrieves a single immutable audit log entry by its primary identifier with complete state diff and sanitized metadata.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'aud_12345' } },
        ],
        responses: {
          '200': {
            description: 'Audit log entry retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication credentials required' },
          '403': { description: 'Forbidden: Requires system:audit_read permission' },
          '404': { description: 'Audit log record not found' },
        },
      },
      delete: {
        tags: ['Audit & Compliance'],
        summary: 'Prohibited Mutation (Immutable Audit Invariant)',
        description: 'Always returns HTTP 405. Audit records are append-only under ADR-0022 and can never be deleted.',
        security: [{ BearerAuth: [] }],
        responses: {
          '405': { description: 'Method Not Allowed: Audit logs are immutable append-only records.' },
        },
      },
    },
    '/api/v1/geo/divisions': {
      get: {
        tags: ['Internationalization & Localization'],
        summary: 'List Bangladesh divisions',
        responses: { '200': { description: 'Eight bilingual Bangladesh divisions' } },
      },
    },
    '/api/v1/geo/districts': {
      get: {
        tags: ['Internationalization & Localization'],
        summary: 'List Bangladesh districts',
        parameters: [{ name: 'division', in: 'query', required: false, schema: { type: 'string', example: 'DHAKA' } }],
        responses: { '200': { description: 'Bilingual districts filtered by division' }, '400': { description: 'Invalid division' } },
      },
    },
    '/api/v1/geo/upazilas': {
      get: {
        tags: ['Internationalization & Localization'],
        summary: 'List Bangladesh upazilas or thanas',
        parameters: [{ name: 'district', in: 'query', required: false, schema: { type: 'string', example: 'dhaka' } }],
        responses: { '200': { description: 'Upazilas/thanas filtered by district' }, '400': { description: 'Invalid district' } },
      },
    },
    '/api/v1/customer/addresses': {
      get: {
        tags: ['Customer & Ownership'],
        summary: 'List the authenticated customer addresses',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Customer addresses' }, '401': { description: 'Authentication required' } },
      },
      post: {
        tags: ['Customer & Ownership'],
        summary: 'Create a normalized Bangladesh customer address',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerAddressRequest' } } } },
        responses: { '201': { description: 'Address created' }, '422': { description: 'Invalid phone or geography' } },
      },
    },
    '/api/v1/customer/addresses/{id}': {
      get: {
        tags: ['Customer & Ownership'],
        summary: 'Get an authenticated customer address by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'adr_...' } }],
        responses: { '200': { description: 'Address retrieved successfully' }, '404': { description: 'Address not found' } },
      },
      put: {
        tags: ['Customer & Ownership'],
        summary: 'Update an authenticated customer address with OCC',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'adr_...' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['version'], properties: { version: { type: 'integer' } } } } } },
        responses: { '200': { description: 'Address updated successfully' }, '409': { description: 'Version conflict' }, '422': { description: 'Validation failed' } },
      },
      patch: {
        tags: ['Customer & Ownership'],
        summary: 'Set customer address as default',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'adr_...' } }],
        responses: { '200': { description: 'Address set as primary default' }, '404': { description: 'Address not found' } },
      },
      delete: {
        tags: ['Customer & Ownership'],
        summary: 'Soft-delete an authenticated customer address',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'adr_...' } }],
        responses: { '200': { description: 'Address deleted' }, '404': { description: 'Address not found' } },
      },
    },
    '/api/v1/categories': {
      get: { tags: ['Catalog'], summary: 'Get Public Category Hierarchy', responses: { '200': { description: 'Active category tree retrieved' } } },
    },
    '/api/v1/admin/categories': {
      get: { tags: ['Catalog'], summary: 'Get Category Administration Tree', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Category tree retrieved' }, '403': { description: 'Requires catalog write permission' } } },
      post: { tags: ['Catalog'], summary: 'Create Category', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryWriteRequest' } } } }, responses: { '201': { description: 'Category created' }, '409': { description: 'Slug conflict' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/admin/categories/{id}': {
      patch: { tags: ['Catalog'], summary: 'Update Category Hierarchy Node', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/CategoryWriteRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }] } } } }, responses: { '200': { description: 'Category updated' }, '409': { description: 'Version or hierarchy conflict' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/collections': {
      get: { tags: ['Catalog'], summary: 'List published collections', responses: { '200': { description: 'Published collections with eligible memberships' } } },
    },
    '/api/v1/collections/{slug}': {
      get: { tags: ['Catalog'], summary: 'Get a published collection by slug', parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Published collection' }, '404': { description: 'Collection not found' } } },
    },
    '/api/v1/admin/collections': {
      get: { tags: ['Catalog'], summary: 'List collections for administration', security: [{ BearerAuth: [] }], responses: { '200': { description: 'All active and draft collections' } } },
      post: { tags: ['Catalog'], summary: 'Create a curated or rule-based collection', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CollectionWriteRequest' } } } }, responses: { '201': { description: 'Collection created' }, '409': { description: 'Slug conflict' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/admin/collections/{id}': {
      patch: { tags: ['Catalog'], summary: 'Update a collection', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CollectionUpdateRequest' } } } }, responses: { '200': { description: 'Collection updated' }, '409': { description: 'Version conflict' } } },
      post: { tags: ['Catalog'], summary: 'Publish or archive a collection', description: 'Use ?action=publish or ?action=archive.', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'action', in: 'query', required: true, schema: { type: 'string', enum: ['publish', 'archive'] } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } } } } }, responses: { '200': { description: 'Collection status changed' }, '409': { description: 'Invalid status transition or version conflict' } } },
    },
    '/api/v1/admin/collections/{id}/products': {
      put: { tags: ['Catalog'], summary: 'Replace curated collection product memberships', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CollectionProductsRequest' } } } }, responses: { '200': { description: 'Memberships replaced' }, '422': { description: 'Invalid curated membership list' } } },
    },
    '/api/v1/catalog/products/{id}/translations': {
      get: { tags: ['Catalog'], summary: 'Read localized product descriptions and specifications', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'locale', in: 'query', required: false, schema: { type: 'string', enum: ['bn-BD', 'en-BD'] } }], responses: { '200': { description: 'Localized product content with fallback' }, '404': { description: 'Product not found' } } },
    },
    '/api/v1/seller/catalog/products/{id}/translations': {
      put: { tags: ['Catalog'], summary: 'Upsert localized product descriptions, specifications, and rich content', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductTranslationWriteRequest' } } } }, responses: { '200': { description: 'Localized product content saved' }, '403': { description: 'Seller tenant violation' }, '422': { description: 'Invalid localized content' } } },
    },
    '/api/v1/seller/catalog/products/{id}/media': {
      get: { tags: ['Catalog'], summary: 'List owned product media', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product media list' } } },
      post: { tags: ['Catalog'], summary: 'Upload a product image or video to private S3-compatible storage', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, mediaType: { type: 'string', enum: ['IMAGE', 'VIDEO'] }, isPrimary: { type: 'boolean' }, displayOrder: { type: 'integer' }, altText: { type: 'string' }, altTextBn: { type: 'string' } } } } } }, responses: { '201': { description: 'Media uploaded' }, '403': { description: 'Seller tenant violation' }, '422': { description: 'Invalid media type or size' } } },
    },
    '/api/v1/seller/catalog/products/{id}/media/{mediaId}': {
      get: { tags: ['Catalog'], summary: 'Create a short-lived signed product media URL', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'mediaId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Signed media URL' }, '404': { description: 'Media not found' } } },
      delete: { tags: ['Catalog'], summary: 'Soft-delete owned product media', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'mediaId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Media deleted' }, '403': { description: 'Seller tenant violation' } } },
    },
    '/api/v1/seller/catalog/identifiers/check': {
      get: { tags: ['Catalog'], summary: 'Check SKU and barcode availability', security: [{ BearerAuth: [] }], parameters: [{ name: 'sku', in: 'query', required: false, schema: { type: 'string', pattern: '^[A-Z0-9_-]{3,50}$' } }, { name: 'barcode', in: 'query', required: false, schema: { type: 'string', pattern: '^[0-9]{8,14}$' } }], responses: { '200': { description: 'Identifier availability result' }, '422': { description: 'Invalid identifier format' } } },
    },
    '/api/v1/seller/catalog/products': {
      get: { tags: ['Catalog'], summary: 'List products owned by the authenticated seller', security: [{ BearerAuth: [] }], parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }], responses: { '200': { description: 'Seller-scoped product list' }, '403': { description: 'Seller tenant required' } } },
      post: { tags: ['Catalog'], summary: 'Create a seller-scoped product draft', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductDraftRequest' } } } }, responses: { '201': { description: 'Draft created' }, '422': { description: 'Invalid draft payload' } } },
    },
    '/api/v1/seller/catalog/products/{id}': {
      get: { tags: ['Catalog'], summary: 'Get an owned product draft', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product draft' }, '404': { description: 'Product not found' } } },
      patch: { tags: ['Catalog'], summary: 'Update an owned product draft', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductDraftUpdateRequest' } } } }, responses: { '200': { description: 'Draft updated' }, '409': { description: 'Version or lifecycle conflict' }, '422': { description: 'Invalid draft payload' } } },
      delete: { tags: ['Catalog'], summary: 'Soft-delete an owned draft product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'version', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } }], responses: { '200': { description: 'Product deleted' }, '409': { description: 'Version or lifecycle conflict' } } },
    },
    '/api/v1/seller/catalog/products/{id}/variants': {
      get: { tags: ['Catalog'], summary: 'List seller product variants', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product variants' } } },
      post: { tags: ['Catalog'], summary: 'Create a seller product variant', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductVariantWriteRequest' } } } }, responses: { '201': { description: 'Variant created' }, '409': { description: 'SKU or version conflict' }, '422': { description: 'Invalid variant' } } },
    },
    '/api/v1/seller/catalog/products/{id}/variants/{variantId}': {
      get: { tags: ['Catalog'], summary: 'Get a seller product variant', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product variant' }, '404': { description: 'Variant not found' } } },
      patch: { tags: ['Catalog'], summary: 'Update a seller product variant', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/ProductVariantWriteRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }] } } } }, responses: { '200': { description: 'Variant updated' }, '409': { description: 'SKU or version conflict' } } },
      delete: { tags: ['Catalog'], summary: 'Soft-delete a seller product variant', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'version', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } }], responses: { '200': { description: 'Variant deleted' }, '409': { description: 'Version conflict' } } },
    },
    '/api/v1/seller/catalog/products/{id}/submit': {
      post: { tags: ['Catalog'], summary: 'Submit an owned product for administrative approval', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductApprovalSubmitRequest' } } } }, responses: { '200': { description: 'Product submitted' }, '409': { description: 'Invalid state or version conflict' }, '422': { description: 'Readiness validation failed' } } },
    },
    '/api/v1/seller/catalog/products/{id}/validation': {
      get: { tags: ['Catalog'], summary: 'Validate product approval readiness', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Readiness report' } } },
    },
    '/api/v1/admin/catalog/products': {
      get: { tags: ['Catalog'], summary: 'List catalog products for Admin operations', security: [{ BearerAuth: [] }], parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'] } }, { name: 'categoryId', in: 'query', schema: { type: 'string' } }, { name: 'brandId', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } }, { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }], responses: { '200': { description: 'Paginated catalog products' }, '403': { description: 'Requires catalog read permission' } } },
    },
    '/api/v1/admin/catalog/products/{id}': {
      get: { tags: ['Catalog'], summary: 'Get a catalog product for Admin operations', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Catalog product' }, '404': { description: 'Product not found' } } },
      patch: { tags: ['Catalog'], summary: 'Update catalog product metadata', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductDraftUpdateRequest' } } } }, responses: { '200': { description: 'Product updated' }, '403': { description: 'Requires catalog write permission' }, '409': { description: 'Version conflict' } } },
      delete: { tags: ['Catalog'], summary: 'Soft-delete a catalog product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'version', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } }], responses: { '200': { description: 'Product deleted' }, '403': { description: 'Requires catalog write permission' }, '409': { description: 'Version or lifecycle conflict' } } },
    },
    '/api/v1/admin/catalog/products/pending': {
      get: { tags: ['Catalog'], summary: 'List products pending approval', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Approval queue' }, '403': { description: 'Requires catalog approval permission' } } },
    },
    '/api/v1/admin/catalog/products/{id}/approve': {
      post: { tags: ['Catalog'], summary: 'Approve a pending product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductApprovalActionRequest' } } } }, responses: { '200': { description: 'Product approved' }, '409': { description: 'State or version conflict' }, '422': { description: 'Readiness validation failed' } } },
    },
    '/api/v1/admin/catalog/products/{id}/reject': {
      post: { tags: ['Catalog'], summary: 'Reject a pending product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductApprovalActionRequest' } } } }, responses: { '200': { description: 'Product rejected' }, '409': { description: 'State or version conflict' } } },
    },
    '/api/v1/admin/catalog/products/{id}/publish': {
      post: { tags: ['Catalog'], summary: 'Publish an approved product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductApprovalActionRequest' } } } }, responses: { '200': { description: 'Product published' }, '403': { description: 'Seller publication is forbidden' }, '409': { description: 'State or version conflict' } } },
    },
    '/api/v1/admin/catalog/products/{id}/archive': {
      post: { tags: ['Catalog'], summary: 'Archive an approved or published product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductApprovalActionRequest' } } } }, responses: { '200': { description: 'Product archived' }, '409': { description: 'State or version conflict' } } },
    },
    '/api/v1/seller/catalog/products/{id}/versions': {
      get: { tags: ['Catalog'], summary: 'List seller-scoped immutable product versions', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product version history' }, '403': { description: 'Seller tenant violation' } } },
    },
    '/api/v1/seller/catalog/products/{id}/versions/{version}': {
      get: { tags: ['Catalog'], summary: 'Read one seller-scoped product version', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'version', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], responses: { '200': { description: 'Product version snapshot' }, '404': { description: 'Version not found' } } },
    },
    '/api/v1/admin/catalog/products/{id}/versions': {
      get: { tags: ['Catalog'], summary: 'List immutable product versions for audit review', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product version history' }, '403': { description: 'Requires catalog administration permission' } } },
    },
    '/api/v1/admin/catalog/products/{id}/versions/{version}': {
      get: { tags: ['Catalog'], summary: 'Read one immutable product version for audit review', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'version', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], responses: { '200': { description: 'Product version snapshot' }, '404': { description: 'Version not found' } } },
    },
    '/api/v1/admin/catalog/products/{id}/review-history': {
      get: { tags: ['Catalog'], summary: 'Read immutable product status history', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product review history' } } },
    },
    '/api/v1/admin/catalog/moderation': {
      get: { tags: ['Catalog'], summary: 'List catalog moderation reviews and duplicate candidates', security: [{ BearerAuth: [] }], parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'REQUEST_CHANGES', 'DISMISSED'] } }, { name: 'severity', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] } }], responses: { '200': { description: 'Moderation queue' }, '403': { description: 'Requires catalog administration permission' } } },
    },
    '/api/v1/admin/catalog/moderation/{id}': {
      get: { tags: ['Catalog'], summary: 'Get a catalog moderation review', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Moderation review' }, '404': { description: 'Review not found' } } },
      post: { tags: ['Catalog'], summary: 'Resolve a catalog moderation review', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ModerationResolveRequest' } } } }, responses: { '200': { description: 'Moderation review resolved' }, '403': { description: 'Requires catalog administration permission' } } },
    },
    '/api/v1/admin/catalog/products/{id}/recheck-duplicates': {
      post: { tags: ['Catalog'], summary: 'Recalculate deterministic duplicate fingerprints for a product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/DuplicateRecheckRequest' } } } }, responses: { '200': { description: 'Duplicate analysis completed' }, '403': { description: 'Requires catalog administration permission' } } },
    },
    '/api/v1/seller/catalog/imports': {
      get: { tags: ['Catalog'], summary: 'List seller catalog import jobs', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Import jobs' } } },
      post: { tags: ['Catalog'], summary: 'Create and validate a seller catalog import', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogImportRequest' } } } }, responses: { '201': { description: 'Import job created' }, '409': { description: 'Idempotency conflict' }, '422': { description: 'File or row validation failed' } } },
    },
    '/api/v1/seller/catalog/imports/{id}': {
      get: { tags: ['Catalog'], summary: 'Get a seller catalog import job', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Import job' } } },
    },
    '/api/v1/seller/catalog/imports/{id}/validate': {
      post: { tags: ['Catalog'], summary: 'Revalidate a seller catalog import', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } }, responses: { '200': { description: 'Validation result' } } },
    },
    '/api/v1/seller/catalog/imports/{id}/commit': {
      post: { tags: ['Catalog'], summary: 'Commit validated catalog import rows as drafts', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } }, responses: { '200': { description: 'Import committed' }, '409': { description: 'Import is not ready' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/seller/catalog/imports/{id}/errors': {
      get: { tags: ['Catalog'], summary: 'List row-level catalog import errors', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Import row errors' } } },
    },
    '/api/v1/seller/catalog/exports': {
      get: { tags: ['Catalog'], summary: 'List seller catalog export jobs', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Export jobs' } } },
      post: { tags: ['Catalog'], summary: 'Generate a signed seller catalog CSV export', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogExportRequest' } } } }, responses: { '202': { description: 'Export generated or queued' } } },
    },
    '/api/v1/seller/catalog/exports/{id}': {
      get: { tags: ['Catalog'], summary: 'Get a signed catalog export download URL', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Signed download URL' }, '409': { description: 'Export not ready or expired' } } },
    },
    '/api/v1/catalog/categories/{id}/onboarding-template': {
      get: { tags: ['Catalog'], summary: 'Get category-specific seller onboarding guidance', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'locale', in: 'query', required: false, schema: { type: 'string', enum: ['bn-BD', 'en-BD'] } }], responses: { '200': { description: 'Onboarding template or empty result' } } },
    },
    '/api/v1/seller/catalog/onboarding': {
      get: { tags: ['Catalog'], summary: 'List onboarding progress for the authenticated seller', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Seller onboarding progress' }, '403': { description: 'Seller scope required' } } },
    },
    '/api/v1/seller/catalog/onboarding/{templateId}/progress': {
      post: { tags: ['Catalog'], summary: 'Save onboarding checklist progress', security: [{ BearerAuth: [] }], parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OnboardingProgressRequest' } } } }, responses: { '200': { description: 'Progress saved' }, '403': { description: 'Seller tenant violation' }, '422': { description: 'Invalid checklist item' } } },
    },
    '/api/v1/admin/catalog/onboarding-templates': {
      get: { tags: ['Catalog'], summary: 'List seller catalog onboarding templates', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Onboarding templates' } } },
      post: { tags: ['Catalog'], summary: 'Create seller catalog onboarding template', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OnboardingTemplateWriteRequest' } } } }, responses: { '201': { description: 'Onboarding template created' }, '409': { description: 'Template conflict' } } },
    },
    '/api/v1/admin/catalog/onboarding-templates/{id}': {
      patch: { tags: ['Catalog'], summary: 'Update seller catalog onboarding template', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OnboardingTemplateUpdateRequest' } } } }, responses: { '200': { description: 'Onboarding template updated' }, '409': { description: 'Version conflict' } } },
    },
    '/api/v1/admin/catalog/categories/{id}/translations': {
      get: { tags: ['Catalog'], summary: 'Read category translation and SEO metadata', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'locale', in: 'query', required: false, schema: { type: 'string', enum: ['bn-BD', 'en-BD'] } }], responses: { '200': { description: 'Category translation' } } },
      put: { tags: ['Catalog'], summary: 'Upsert category translation and SEO metadata', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryTranslationWriteRequest' } } } }, responses: { '200': { description: 'Category translation saved' } } },
    },
    '/api/v1/admin/catalog/brands/{id}/translations': {
      get: { tags: ['Catalog'], summary: 'Read brand translation and SEO metadata', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'locale', in: 'query', required: false, schema: { type: 'string', enum: ['bn-BD', 'en-BD'] } }], responses: { '200': { description: 'Brand translation' } } },
      put: { tags: ['Catalog'], summary: 'Upsert brand translation and SEO metadata', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BrandTranslationWriteRequest' } } } }, responses: { '200': { description: 'Brand translation saved' } } },
    },
    '/api/v1/admin/catalog/tax-rules': {
      get: { tags: ['Catalog'], summary: 'List effective-date tax rules', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Tax rules' } } },
      post: { tags: ['Catalog'], summary: 'Create an effective-date tax rule', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxRuleWriteRequest' } } } }, responses: { '201': { description: 'Tax rule created' }, '422': { description: 'Invalid date range or tax rate' } } },
    },
    '/api/v1/admin/catalog/tax-rules/{id}': {
      patch: { tags: ['Catalog'], summary: 'Update an effective-date tax rule', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxRuleUpdateRequest' } } } }, responses: { '200': { description: 'Tax rule updated' }, '409': { description: 'Version conflict' } } },
    },
    '/api/v1/admin/catalog/attributes': {
      get: { tags: ['Catalog'], summary: 'List governed catalog attributes', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Catalog attributes' } } },
      post: { tags: ['Catalog'], summary: 'Create governed catalog attribute', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogAttributeWriteRequest' } } } }, responses: { '201': { description: 'Attribute created' }, '409': { description: 'Code conflict' }, '422': { description: 'Validation failed' } } },
    },
    '/api/v1/admin/catalog/attributes/{id}': {
      patch: { tags: ['Catalog'], summary: 'Update governed catalog attribute', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogAttributeUpdateRequest' } } } }, responses: { '200': { description: 'Attribute updated' }, '409': { description: 'Version conflict' } } },
    },
    '/api/v1/admin/catalog/attributes/{id}/values': {
      get: { tags: ['Catalog'], summary: 'List governed values for an attribute', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Attribute values' } } },
      post: { tags: ['Catalog'], summary: 'Create governed attribute value', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogAttributeValueWriteRequest' } } } }, responses: { '201': { description: 'Value created' }, '409': { description: 'Code conflict' } } },
    },
    '/api/v1/admin/catalog/attribute-values/{id}': {
      patch: { tags: ['Catalog'], summary: 'Update governed attribute value', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogAttributeValueUpdateRequest' } } } }, responses: { '200': { description: 'Value updated' }, '409': { description: 'Version conflict' } } },
    },
    '/api/v1/catalog/categories/{id}/attributes': {
      get: { tags: ['Catalog'], summary: 'List active attributes assigned to a category', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Category attribute contract' } } },
    },
    '/api/v1/catalog/attributes/{id}/values': {
      get: { tags: ['Catalog'], summary: 'List active values for a catalog attribute', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Attribute values' } } },
    },
    '/api/v1/admin/catalog/categories/{id}/attributes': {
      put: { tags: ['Catalog'], summary: 'Replace category attribute assignments', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryAttributeAssignmentsRequest' } } } }, responses: { '200': { description: 'Assignments replaced' }, '422': { description: 'Invalid assignment' } } },
    },
    '/api/v1/seller/catalog/products/{id}/option-set': {
      get: { tags: ['Catalog'], summary: 'Read product option sets', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product option sets' } } },
      put: { tags: ['Catalog'], summary: 'Replace product option sets', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductOptionSetsRequest' } } } }, responses: { '200': { description: 'Option sets replaced' }, '409': { description: 'Version conflict' } } },
    },
    '/api/v1/seller/catalog/products/{id}/variant-combinations': {
      get: { tags: ['Catalog'], summary: 'Generate governed variant combinations', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'max', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 1000, default: 1000 } }], responses: { '200': { description: 'Generated variant combinations' }, '422': { description: 'Combination count or option validation failed' } } },
    },
    '/api/v1/seller/catalog/products/{id}/variant-validation': {
      get: { tags: ['Catalog'], summary: 'Validate variant completeness and duplicate combinations', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Variant validation report' } } },
    },
    '/api/v1/seller/catalog/products/{id}/variants/{variantId}/options': {
      get: { tags: ['Catalog'], summary: 'Read normalized variant options', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Variant options' } } },
      put: { tags: ['Catalog'], summary: 'Replace normalized variant options', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VariantOptionsRequest' } } } }, responses: { '200': { description: 'Variant options replaced' }, '409': { description: 'Version conflict' } } },
    },
    '/api/v1/content/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Read published localized CMS content',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'locale', in: 'query', required: false, schema: { type: 'string', example: 'bn-BD' } },
        ],
        responses: {
          '200': { description: 'Published content returned with locale fallback' },
          '404': { description: 'Published content not found' },
        },
      },
    },
    '/api/v1/admin/content': {
      post: {
        tags: ['Catalog'],
        summary: 'Create localized CMS content',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CmsContentWriteRequest' } } } },
        responses: { '201': { description: 'CMS content created' }, '400': { description: 'Validation failed' }, '403': { description: 'Administrator access required' } },
      },
    },
    '/api/v1/admin/content/{id}': {
      patch: {
        tags: ['Catalog'],
        summary: 'Update localized CMS content with optimistic concurrency',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CmsContentWriteRequest' } } } },
        responses: { '200': { description: 'CMS content updated' }, '409': { description: 'Version conflict' }, '403': { description: 'Administrator access required' } },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT bearer token in the format: Bearer <token>',
      },
    },
    schemas: {
      ApiSuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
        required: ['success', 'data'],
      },
      SellerStoreSettingsRequest: {
        type: 'object',
        required: ['sellerId', 'version'],
        properties: {
          sellerId: { type: 'string' },
          logoUrl: { type: 'string', format: 'uri', nullable: true },
          bannerUrl: { type: 'string', format: 'uri', nullable: true },
          supportEmail: { type: 'string', format: 'email', nullable: true },
          supportPhone: { type: 'string', nullable: true },
          pickupAddress: { type: 'object', nullable: true },
          returnAddress: { type: 'object', nullable: true },
          defaultCourier: { type: 'string', enum: ['PATHAO', 'STEADFAST', 'REDX', 'IN_HOUSE'], nullable: true },
          vacationMode: { type: 'boolean' },
          vacationMessage: { type: 'string', nullable: true },
          version: { type: 'integer', minimum: 1 },
        },
      },
      SellerApplicationDraft: {
        type: 'object',
        required: ['businessName', 'slug'],
        properties: {
          businessName: { type: 'string', minLength: 3, maxLength: 120 },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          tradeLicenseNumber: { type: 'string', nullable: true },
          binNumber: { type: 'string', pattern: '^\\d{9,13}$', nullable: true },
          tinNumber: { type: 'string', pattern: '^\\d{10,12}$', nullable: true },
        },
      },
      CollectionWriteRequest: {
        type: 'object',
        required: ['name', 'slug', 'collectionType'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          description: { type: 'string', nullable: true },
          collectionType: { type: 'string', enum: ['CURATED', 'RULE_BASED'] },
          rule: { $ref: '#/components/schemas/CollectionRule', nullable: true },
          displayOrder: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
        },
      },
      CollectionUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/CollectionWriteRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }],
      },
      CollectionRule: {
        type: 'object', additionalProperties: false,
        properties: {
          status: { type: 'string', enum: ['PUBLISHED'] }, categoryId: { type: 'string' }, brandId: { type: 'string' }, sellerId: { type: 'string' },
          minPricePoisha: { type: 'integer', minimum: 0 }, maxPricePoisha: { type: 'integer', minimum: 0 }, tags: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 50 } },
        },
      },
      CollectionProductsRequest: {
        type: 'object', required: ['productIds', 'version'], properties: { productIds: { type: 'array', minItems: 1, maxItems: 500, uniqueItems: true, items: { type: 'string' } }, version: { type: 'integer', minimum: 1 } },
      },
      CatalogAttributeWriteRequest: {
        type: 'object', required: ['code', 'name', 'inputType'], properties: { code: { type: 'string', pattern: '^[a-z0-9]+(?:_[a-z0-9]+)*$' }, name: { type: 'string' }, nameBn: { type: 'string', nullable: true }, inputType: { type: 'string', enum: ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'COLOR'] }, isFilterable: { type: 'boolean' }, isComparable: { type: 'boolean' }, isVariantAllowed: { type: 'boolean' }, displayOrder: { type: 'integer', minimum: 0 }, isActive: { type: 'boolean' } },
      },
      CatalogAttributeUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/CatalogAttributeWriteRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }],
      },
      CatalogAttributeValueWriteRequest: {
        type: 'object', required: ['code', 'label'], properties: { code: { type: 'string' }, label: { type: 'string' }, labelBn: { type: 'string', nullable: true }, swatch: { type: 'string', nullable: true }, displayOrder: { type: 'integer', minimum: 0 }, isActive: { type: 'boolean' } },
      },
      CatalogAttributeValueUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/CatalogAttributeValueWriteRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }],
      },
      CategoryAttributeAssignmentsRequest: {
        type: 'object', required: ['assignments'], properties: { assignments: { type: 'array', maxItems: 100, items: { type: 'object', required: ['attributeId'], properties: { attributeId: { type: 'string' }, isRequired: { type: 'boolean' }, isVariantDefining: { type: 'boolean' }, filterableOverride: { type: 'boolean', nullable: true }, displayOrder: { type: 'integer', minimum: 0 } } } } },
      },
      ProductOptionSetsRequest: {
        type: 'object', required: ['version', 'optionSets'], properties: { version: { type: 'integer', minimum: 1 }, optionSets: { type: 'array', maxItems: 20, items: { type: 'object', required: ['attributeId', 'valueIds'], properties: { attributeId: { type: 'string' }, valueIds: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string' } }, isRequired: { type: 'boolean' }, isVariantDefining: { type: 'boolean' }, displayOrder: { type: 'integer', minimum: 0 } } } } },
      },
      VariantOptionsRequest: {
        type: 'object', required: ['version', 'options'], properties: { version: { type: 'integer', minimum: 1 }, options: { type: 'array', maxItems: 20, items: { type: 'object', required: ['attributeId'], properties: { attributeId: { type: 'string' }, valueId: { type: 'string' }, textValue: { type: 'string' }, displayOrder: { type: 'integer', minimum: 0 } } } } },
      },
      ProductApprovalSubmitRequest: {
        type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 }, idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 } },
      },
      ProductApprovalActionRequest: {
        type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 }, reason: { type: 'string', nullable: true }, reviewNotes: { type: 'string', nullable: true } },
      },
      IdentifierAvailabilityResponse: {
        type: 'object', properties: { available: { type: 'boolean' }, sku: { type: 'string', nullable: true }, barcode: { type: 'string', nullable: true }, conflicts: { type: 'object' } }, required: ['available', 'conflicts'],
      },
      ProductTranslationWriteRequest: {
        type: 'object', required: ['locale', 'title', 'description'], properties: { locale: { type: 'string', enum: ['bn-BD', 'en-BD'] }, title: { type: 'string', minLength: 3 }, description: { type: 'string', minLength: 10, maxLength: 10000 }, warranty: { type: 'string', nullable: true }, specifications: { type: 'object', additionalProperties: { type: 'string' } }, richContent: { type: 'array', maxItems: 100, items: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['paragraph', 'heading', 'bullet_list', 'ordered_list', 'quote', 'image', 'video', 'specification_table'] }, text: { type: 'string' }, level: { type: 'integer' }, items: { type: 'array', items: { type: 'string' } }, url: { type: 'string', format: 'uri' }, alt: { type: 'string' }, rows: { type: 'array', items: { type: 'object' } } } } } },
      },
      ProductDraftRequest: {
        type: 'object', required: ['categoryId', 'title', 'slug', 'description', 'basePricePoisha', 'currency', 'productPoint'], properties: { categoryId: { type: 'string' }, brandId: { type: 'string', nullable: true }, title: { type: 'string' }, titleBn: { type: 'string', nullable: true }, slug: { type: 'string' }, description: { type: 'string' }, descriptionBn: { type: 'string', nullable: true }, basePricePoisha: { type: 'integer', minimum: 1 }, compareAtPricePoisha: { type: 'integer', minimum: 1, nullable: true }, currency: { type: 'string', enum: ['BDT'] }, productPoint: { type: 'integer', minimum: 0 }, weightGrams: { type: 'integer', minimum: 0, nullable: true }, lengthMm: { type: 'integer', minimum: 0, nullable: true }, widthMm: { type: 'integer', minimum: 0, nullable: true }, heightMm: { type: 'integer', minimum: 0, nullable: true }, shippingClass: { type: 'string', nullable: true }, requiresShipping: { type: 'boolean' }, sku: { type: 'string', nullable: true }, tags: { type: 'array', items: { type: 'string' } } },
      },
      ProductDraftUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/ProductDraftRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }],
      },
      ProductVariantWriteRequest: {
        type: 'object', required: ['sku', 'title', 'pricePoisha', 'productPoint'], properties: { sku: { type: 'string' }, title: { type: 'string' }, pricePoisha: { type: 'integer', minimum: 1 }, productPoint: { type: 'integer', minimum: 0 }, barcode: { type: 'string', nullable: true } },
      },
      ModerationResolveRequest: {
        type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['APPROVED', 'REJECTED', 'REQUEST_CHANGES', 'DISMISSED'] }, reason: { type: 'string', nullable: true } },
      },
      DuplicateRecheckRequest: {
        type: 'object', properties: { reason: { type: 'string', nullable: true } },
      },
      CatalogImportRequest: {
        type: 'object', required: ['format', 'content'], properties: { format: { type: 'string', enum: ['CSV', 'JSON'] }, content: { type: 'string', maxLength: 5000000 }, mode: { type: 'string', enum: ['DRY_RUN', 'COMMIT'] }, idempotencyKey: { type: 'string', minLength: 8 } },
      },
      CatalogExportRequest: {
        type: 'object', required: ['format'], properties: { format: { type: 'string', enum: ['CSV'] }, status: { type: 'string' } },
      },
      OnboardingTemplateWriteRequest: {
        type: 'object', required: ['templateKey', 'locale', 'name', 'requiredFields', 'recommendedFields', 'attributeGuidance', 'mediaGuidance', 'validationHints'], properties: { templateKey: { type: 'string' }, categoryId: { type: 'string', nullable: true }, locale: { type: 'string', enum: ['bn-BD', 'en-BD'] }, name: { type: 'string' }, requiredFields: { type: 'array', items: { type: 'string' } }, recommendedFields: { type: 'array', items: { type: 'string' } }, attributeGuidance: { type: 'array', items: { type: 'object' } }, mediaGuidance: { type: 'array', items: { type: 'string' } }, titleExample: { type: 'string', nullable: true }, descriptionExample: { type: 'string', nullable: true }, validationHints: { type: 'array', items: { type: 'string' } }, version: { type: 'integer', minimum: 1 }, isActive: { type: 'boolean' } },
      },
      OnboardingTemplateUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/OnboardingTemplateWriteRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }],
      },
      OnboardingProgressRequest: {
        type: 'object', required: ['completedItems'], properties: { completedItems: { type: 'array', items: { type: 'string' } }, dismissed: { type: 'boolean' } },
      },
      CategoryTranslationWriteRequest: {
        type: 'object', required: ['locale', 'name'], properties: { locale: { type: 'string', enum: ['bn-BD', 'en-BD'] }, name: { type: 'string' }, description: { type: 'string', nullable: true }, seoTitle: { type: 'string', nullable: true }, seoDescription: { type: 'string', nullable: true }, breadcrumbLabel: { type: 'string', nullable: true } },
      },
      BrandTranslationWriteRequest: {
        type: 'object', required: ['locale', 'name'], properties: { locale: { type: 'string', enum: ['bn-BD', 'en-BD'] }, name: { type: 'string' }, seoTitle: { type: 'string', nullable: true }, seoDescription: { type: 'string', nullable: true }, breadcrumbLabel: { type: 'string', nullable: true } },
      },
      TaxRuleWriteRequest: {
        type: 'object', required: ['name', 'ratePercent', 'effectiveFrom'], properties: { jurisdiction: { type: 'string', enum: ['BD'] }, categoryId: { type: 'string', nullable: true }, name: { type: 'string' }, taxType: { type: 'string' }, ratePercent: { type: 'number', minimum: 0, maximum: 100 }, priceIncludesTax: { type: 'boolean' }, effectiveFrom: { type: 'string', format: 'date-time' }, effectiveTo: { type: 'string', format: 'date-time', nullable: true }, status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] } },
      },
      TaxRuleUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/TaxRuleWriteRequest' }, { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } }],
      },
      CmsContentWriteRequest: {
        type: 'object',
        required: ['contentType', 'slug', 'translations'],
        properties: {
          contentType: { type: 'string', example: 'landing_page' },
          slug: { type: 'string', example: 'about-alifworld' },
          status: { type: 'string', enum: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
          version: { type: 'integer', minimum: 1 },
          translations: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['locale', 'title', 'body'],
              properties: {
                locale: { type: 'string', example: 'bn-BD' },
                title: { type: 'string' },
                body: { type: 'object', additionalProperties: true },
                seoTitle: { type: 'string' },
                seoDescription: { type: 'string' },
              },
            },
          },
        },
      },
      CategoryWriteRequest: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          nameBn: { type: 'string', nullable: true },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          description: { type: 'string', nullable: true },
          parentId: { type: 'string', nullable: true },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          icon: { type: 'string', nullable: true },
          displayOrder: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
          taxRatePercent: { type: 'number', minimum: 0, maximum: 100 },
          version: { type: 'integer', minimum: 1 },
        },
      },
      CustomerAddressRequest: {
        type: 'object',
        required: ['label', 'recipientName', 'recipientPhone', 'divisionCode', 'districtId', 'addressLine'],
        properties: {
          label: { type: 'string', example: 'Home' },
          recipientName: { type: 'string' },
          recipientPhone: { type: 'string', example: '+8801712345678' },
          divisionCode: { type: 'string', example: 'DHAKA' },
          districtId: { type: 'string', example: 'dhaka' },
          upazilaId: { type: 'string', nullable: true, example: 'gulshan' },
          addressLine: { type: 'string' },
          postalCode: { type: 'string', pattern: '^\\d{4}$' },
          isDefault: { type: 'boolean', default: false },
        },
      },
      ApiErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_FAILED' },
              message: { type: 'string', example: 'Invalid payload submitted' },
              details: { type: 'object', nullable: true },
            },
            required: ['code', 'message'],
          },
        },
        required: ['success', 'error'],
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'pay_01j7x4b9e8m02k3f8d7c6b5a1' },
          orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
          paymentNumber: { type: 'string', example: 'PAY-20260922-0001' },
          gatewayProvider: { type: 'string', enum: ['BKASH', 'NAGAD', 'UPAY', 'ROCKET', 'SSLCOMMERZ', 'COD'] },
          gatewayTransactionId: { type: 'string', example: 'TRX99201948BK' },
          status: { type: 'string', enum: ['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
          amountPoisha: { type: 'string', example: '2534850' },
          currency: { type: 'string', example: 'BDT' },
          feePoisha: { type: 'string', example: '38023' },
          capturedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'orderId', 'paymentNumber', 'gatewayProvider', 'status', 'amountPoisha', 'currency'],
      },
      Refund: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ref_01j7x4b9e8m02k3f8d7c6b5a1' },
          paymentId: { type: 'string', example: 'pay_01j7x4b9e8m02k3f8d7c6b5a1' },
          orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
          refundNumber: { type: 'string', example: 'REF-20260922-0001' },
          amountPoisha: { type: 'string', example: '2199000' },
          currency: { type: 'string', example: 'BDT' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'PROCESSED', 'FAILED', 'REJECTED'] },
          reversalPoints: { type: 'integer', example: 450 },
          reason: { type: 'string', example: 'DAMAGED_GOODS' },
        },
        required: ['id', 'paymentId', 'orderId', 'refundNumber', 'amountPoisha', 'status', 'reversalPoints'],
      },
      SellerSettlement: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'stl_01j7x4b9e8m02k3f8d7c6b5a1' },
          sellerId: { type: 'string', example: 'sel_01j7x4b9e8m02k3f8d7c6b5a1' },
          settlementNumber: { type: 'string', example: 'STL-20260922-0001' },
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          grossOrderPoisha: { type: 'string', example: '2199000' },
          commissionPoisha: { type: 'string', example: '109950' },
          netPayoutPoisha: { type: 'string', example: '2424900' },
          status: { type: 'string', enum: ['PENDING', 'AUDITED', 'APPROVED', 'DISBURSED'] },
        },
        required: ['id', 'sellerId', 'settlementNumber', 'periodStart', 'periodEnd', 'grossOrderPoisha', 'commissionPoisha', 'netPayoutPoisha', 'status'],
      },
      Wallet: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'wal_01j7x4b9e8m02k3f8d7c6b5a1' },
          type: { type: 'string', enum: ['MAIN', 'SHOPPING', 'GOOD_LUCK', 'CHARITY', 'SYSTEM_RESERVE'] },
          currency: { type: 'string', example: 'BDT' },
          availablePoisha: { type: 'string', example: '50000' },
          pendingPoisha: { type: 'string', example: '0' },
          status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'CLOSED'] },
        },
        required: ['id', 'type', 'currency', 'availablePoisha', 'pendingPoisha', 'status'],
      },
      PointAccount: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'pac_01j7x4b9e8m02k3f8d7c6b5a1' },
          userId: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
          availablePoints: { type: 'integer', example: 450 },
          pendingPoints: { type: 'integer', example: 0 },
          lifetimePoints: { type: 'integer', example: 450 },
        },
        required: ['id', 'userId', 'availablePoints', 'pendingPoints', 'lifetimePoints'],
      },
      LedgerJournal: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'jrn_01j7x4b9e8m02k3f8d7c6b5a1' },
          journalNumber: { type: 'string', example: 'JRN-20260922-0001' },
          description: { type: 'string', example: 'Customer order reward distribution' },
          referenceType: { type: 'string', example: 'REWARD_DISTRIBUTION' },
          totalPoisha: { type: 'string', example: '100000' },
          ruleVersion: { type: 'string', example: 'v1.0.0' },
          postedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'journalNumber', 'description', 'referenceType', 'totalPoisha', 'postedAt'],
      },
      DataDictionarySummary: {
        type: 'object',
        properties: {
          totalModels: { type: 'integer', example: 49 },
          lifecycleBreakdown: {
            type: 'object',
            properties: {
              immutable: { type: 'integer', example: 17 },
              softDelete: { type: 'integer', example: 30 },
              ephemeral: { type: 'integer', example: 2 },
            },
            required: ['immutable', 'softDelete', 'ephemeral'],
          },
          models: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Order' },
                tableName: { type: 'string', example: 'orders' },
                deletionPolicy: { type: 'string', enum: ['IMMUTABLE', 'SOFT_DELETE', 'EPHEMERAL'] },
                fieldsCount: { type: 'integer', example: 22 },
              },
              required: ['name', 'tableName', 'deletionPolicy'],
            },
          },
        },
        required: ['totalModels', 'lifecycleBreakdown'],
      },
      MigrationStatus: {
        type: 'object',
        properties: {
          currentMigration: { type: 'string', example: '20260922000008_wallets_points_rewards_ranks_immutable_ledgers' },
          appliedMigrationsCount: { type: 'integer', example: 8 },
          expandContractPhase: { type: 'string', enum: ['EXPAND', 'DUAL_WRITE', 'BACKFILL', 'CONTRACT', 'STABLE'], example: 'STABLE' },
          status: { type: 'string', example: 'HEALTHY' },
        },
        required: ['currentMigration', 'appliedMigrationsCount', 'expandContractPhase', 'status'],
      },
      TokenPolicyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              tokenPolicies: {
                type: 'object',
                properties: {
                  accessTokenTtlSeconds: { type: 'integer', example: 900 },
                  webRefreshTokenTtlSeconds: { type: 'integer', example: 604800 },
                  mobileRefreshTokenTtlSeconds: { type: 'integer', example: 2592000 },
                  sessionInactivityTimeoutSeconds: { type: 'integer', example: 172800 },
                  maxActiveSessionsPerUser: { type: 'integer', example: 5 },
                  otpTokenTtlSeconds: { type: 'integer', example: 300 },
                  maxOtpAttempts: { type: 'integer', example: 3 },
                },
                required: ['accessTokenTtlSeconds', 'webRefreshTokenTtlSeconds', 'mobileRefreshTokenTtlSeconds', 'maxActiveSessionsPerUser'],
              },
              cookieSettings: {
                type: 'object',
                properties: {
                  accessTokenCookie: { type: 'string', example: 'aw_access_token' },
                  refreshTokenCookie: { type: 'string', example: 'aw_refresh_token' },
                  httpOnly: { type: 'boolean', example: true },
                  sameSite: { type: 'string', example: 'lax' },
                  path: { type: 'string', example: '/' },
                },
              },
              passwordRequirements: {
                type: 'object',
                properties: {
                  minLength: { type: 'integer', example: 8 },
                  maxLength: { type: 'integer', example: 128 },
                  rules: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              supportedClientTypes: {
                type: 'array',
                items: { type: 'string' },
                example: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'],
              },
              supportedTokenTypes: {
                type: 'array',
                items: { type: 'string' },
                example: ['Bearer'],
              },
            },
            required: ['tokenPolicies', 'cookieSettings', 'passwordRequirements'],
          },
        },
        required: ['success', 'data'],
      },
      RefreshTokenRequest: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description: 'The refresh token to rotate (optional if supplied via aw_refresh_token HttpOnly cookie)',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
      RefreshTokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              tokenType: { type: 'string', example: 'Bearer' },
              expiresIn: { type: 'integer', example: 900 },
              familyId: { type: 'string', example: 'fam_01j7x4b9e8m02k3f8d7c6b5a1' },
              generation: { type: 'integer', example: 1 },
            },
            required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn', 'familyId', 'generation'],
          },
        },
        required: ['success', 'data'],
      },
      LogoutResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Logged out successfully' },
            },
            required: ['message'],
          },
        },
        required: ['success', 'data'],
      },
      SessionItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], example: 'WEB' },
          deviceSummary: { type: 'string', example: 'Google Chrome on macOS' },
          ipAddress: { type: 'string', nullable: true, example: '103.112.*.*' },
          userAgent: { type: 'string', nullable: true, example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...' },
          isCurrent: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-22T12:00:00.000Z' },
          lastActiveAt: { type: 'string', format: 'date-time', example: '2026-09-22T12:30:00.000Z' },
          expiresAt: { type: 'string', format: 'date-time', example: '2026-09-29T12:00:00.000Z' },
        },
        required: ['id', 'clientType', 'deviceSummary', 'isCurrent', 'createdAt', 'lastActiveAt', 'expiresAt'],
      },
      SessionListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              sessions: {
                type: 'array',
                items: { $ref: '#/components/schemas/SessionItem' },
              },
              total: { type: 'integer', example: 2 },
              currentSessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
            },
            required: ['sessions', 'total', 'currentSessionId'],
          },
        },
        required: ['success', 'data'],
      },
      RevokeSessionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Session revoked successfully' },
              sessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
              isCurrent: { type: 'boolean', example: false },
            },
            required: ['message', 'sessionId', 'isCurrent'],
          },
        },
        required: ['success', 'data'],
      },
      RevokeOthersResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'All other sessions have been logged out successfully' },
              revokedCount: { type: 'integer', example: 3 },
              currentSessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
            },
            required: ['message', 'revokedCount', 'currentSessionId'],
          },
        },
        required: ['success', 'data'],
      },
      RevokeAllResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'All sessions terminated everywhere. Please sign in again.' },
              tokenVersion: { type: 'integer', example: 2 },
            },
            required: ['message', 'tokenVersion'],
          },
        },
        required: ['success', 'data'],
      },
      PasswordResetRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'customer@example.com' },
          locale: { type: 'string', enum: ['en-BD', 'bn-BD'], default: 'bn-BD' },
        },
        required: ['email'],
      },
      PasswordResetRequestResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              accepted: { type: 'boolean', const: true },
              message: { type: 'string' },
              cooldownSeconds: { type: 'integer', example: 60 },
            },
            required: ['accepted', 'message', 'cooldownSeconds'],
          },
        },
        required: ['success', 'data'],
      },
      PasswordResetCompletionRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          token: { type: 'string', minLength: 32, writeOnly: true },
          newPassword: { type: 'string', format: 'password', minLength: 8, maxLength: 128, writeOnly: true },
          confirmPassword: { type: 'string', format: 'password', maxLength: 128, writeOnly: true },
        },
        required: ['email', 'token', 'newPassword', 'confirmPassword'],
      },
      PasswordChangeRequest: {
        type: 'object',
        properties: {
          currentPassword: { type: 'string', format: 'password', maxLength: 128, writeOnly: true },
          newPassword: { type: 'string', format: 'password', minLength: 8, maxLength: 128, writeOnly: true },
          confirmPassword: { type: 'string', format: 'password', maxLength: 128, writeOnly: true },
        },
        required: ['currentPassword', 'newPassword', 'confirmPassword'],
      },
      PasswordMutationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              passwordReset: { type: 'boolean' },
              passwordChanged: { type: 'boolean' },
              sessionsRevoked: { type: 'boolean', const: true },
              message: { type: 'string' },
            },
            required: ['sessionsRevoked', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      OAuthVerifyRequest: {
        type: 'object',
        properties: {
          idToken: { type: 'string', description: 'Google ID token from Flutter SDK' },
          accessToken: { type: 'string', description: 'Facebook access token from Flutter SDK' },
          clientType: { type: 'string', enum: ['MOBILE_FLUTTER', 'WEB', 'POS'], default: 'MOBILE_FLUTTER' },
          deviceInfo: { type: 'string', example: 'Google Pixel 8 (Android 14)' },
        },
      },
      OAuthVerifyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/AuthUser' },
              tokens: { $ref: '#/components/schemas/AuthTokenPair' },
              sessionId: { type: 'string', example: 'ses_01HA0000000000000000000000' },
              isNewUser: { type: 'boolean', example: false },
            },
            required: ['user', 'tokens', 'sessionId', 'isNewUser'],
          },
        },
        required: ['success', 'data'],
      },
      TokenIntrospectRequest: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
        required: ['token'],
      },
      TokenIntrospectResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              active: { type: 'boolean', example: true },
              sub: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              email: { type: 'string', example: 'customer@mail.com' },
              roles: {
                type: 'array',
                items: { type: 'string' },
                example: ['CUSTOMER'],
              },
              permissions: {
                type: 'array',
                items: { type: 'string' },
                example: ['orders:read', 'orders:create'],
              },
              sellerId: { type: 'string', nullable: true },
              clientType: { type: 'string', example: 'WEB' },
              tokenVersion: { type: 'integer', example: 1 },
              exp: { type: 'integer', example: 1727006400 },
              iat: { type: 'integer', example: 1727005500 },
              error: { type: 'string' },
            },
            required: ['active'],
          },
        },
        required: ['success', 'data'],
      },
      CustomerRegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Tanvir Ahmed' },
          email: { type: 'string', format: 'email', example: 'tanvir@example.com' },
          phone: { type: 'string', example: '+8801700112233' },
          password: { type: 'string', format: 'password', example: 'Dhaka@Commerce#2026!' },
          locale: { type: 'string', enum: ['bn-BD', 'en-BD'], default: 'bn-BD' },
          acceptTerms: { type: 'boolean', example: true },
        },
        required: ['name', 'email', 'password', 'acceptTerms'],
      },
      CustomerRegisterResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              email: { type: 'string', example: 'tanvir@example.com' },
              name: { type: 'string', example: 'Tanvir Ahmed' },
              phone: { type: 'string', example: '+8801700112233', nullable: true },
              status: { type: 'string', example: 'ACTIVE' },
              isEmailVerified: { type: 'boolean', example: false },
              message: { type: 'string', example: 'Account registered successfully. A 6-digit verification code has been sent to your email.' },
            },
            required: ['userId', 'email', 'name', 'status', 'isEmailVerified', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      VerifyEmailRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'tanvir@example.com' },
          code: { type: 'string', minLength: 6, maxLength: 6, example: '582914' },
        },
        required: ['email', 'code'],
      },
      VerifyEmailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              verified: { type: 'boolean', example: true },
              alreadyVerified: { type: 'boolean', example: false },
              email: { type: 'string', example: 'tanvir@example.com' },
              userId: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              message: { type: 'string', example: 'Email verified successfully! You can now log in to your AlifWorld account.' },
            },
            required: ['verified', 'email', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      ResendVerificationRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'tanvir@example.com' },
        },
        required: ['email'],
      },
      ResendVerificationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              alreadyVerified: { type: 'boolean', example: false },
              message: { type: 'string', example: 'A new 6-digit verification code has been sent to your email.' },
              cooldownSeconds: { type: 'integer', example: 60 },
              devVerificationCode: { type: 'string', example: '582914' },
            },
            required: ['success', 'message', 'cooldownSeconds'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneCheckRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344', description: 'Bangladesh phone number' },
        },
        required: ['phone'],
      },
      PhoneCheckResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '+8801711223344' },
              exists: { type: 'boolean', example: true },
              registered: { type: 'boolean', example: true },
              name: { type: 'string', example: 'Rahim Khan', nullable: true },
              status: { type: 'string', example: 'ACTIVE', nullable: true },
            },
            required: ['phone', 'exists', 'registered'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneSendOtpRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          purpose: { type: 'string', enum: ['LOGIN', 'REGISTER'], default: 'LOGIN' },
        },
        required: ['phone'],
      },
      PhoneSendOtpResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '+8801711223344' },
              cooldownSeconds: { type: 'integer', example: 60 },
              expiresInSeconds: { type: 'integer', example: 300 },
              message: { type: 'string', example: 'Verification code sent successfully.' },
              devOtp: { type: 'string', example: '123456' },
            },
            required: ['phone', 'cooldownSeconds', 'expiresInSeconds', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneVerifyLoginRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], default: 'WEB' },
          deviceInfo: { type: 'string', example: 'Chrome on macOS' },
        },
        required: ['phone', 'code'],
      },
      PhoneVerifyRegisterRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
        },
        required: ['phone', 'code'],
      },
      PhoneVerifyRegisterResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '+8801711223344' },
              verified: { type: 'boolean', example: true },
              verificationTicket: { type: 'string', example: 'regticket_a89f...' },
              expiresInSeconds: { type: 'integer', example: 1800 },
              message: { type: 'string', example: 'Phone number verified. Please complete profile details.' },
            },
            required: ['phone', 'verified', 'verificationTicket', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneCompleteRegistrationRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          verificationTicket: { type: 'string', example: 'regticket_a89f...' },
          firstName: { type: 'string', example: 'Tanvir' },
          lastName: { type: 'string', example: 'Ahmed' },
          password: { type: 'string', format: 'password', example: 'SecureP@ss2026' },
          confirmPassword: { type: 'string', format: 'password', example: 'SecureP@ss2026' },
          address: { type: 'string', nullable: true, example: 'House 12, Road 4, Dhanmondi' },
          division: { type: 'string', nullable: true, example: 'Dhaka' },
          city: { type: 'string', nullable: true, example: 'Dhaka' },
          birthday: { type: 'string', format: 'date', nullable: true, example: '1995-06-15' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true, example: 'MALE' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], default: 'WEB' },
        },
        required: ['phone', 'verificationTicket', 'firstName', 'lastName', 'password', 'confirmPassword'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          identifier: { type: 'string', example: 'tanvir@example.com', description: 'Email address or Bangladesh mobile number (e.g. 01700112233)' },
          password: { type: 'string', format: 'password', example: 'Dhaka@Commerce#2026!' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], default: 'WEB' },
          deviceInfo: { type: 'string', example: 'iPhone 15 Pro (iOS 18.0)' },
        },
        required: ['identifier', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
                  email: { type: 'string', example: 'tanvir@example.com' },
                  phone: { type: 'string', example: '+8801700112233', nullable: true },
                  name: { type: 'string', example: 'Tanvir Ahmed' },
                  status: { type: 'string', example: 'ACTIVE' },
                  isEmailVerified: { type: 'boolean', example: true },
                  isPhoneVerified: { type: 'boolean', example: true },
                  roles: { type: 'array', items: { type: 'string' }, example: ['CUSTOMER'] },
                  permissions: { type: 'array', items: { type: 'string' }, example: ['orders:create', 'orders:read'] },
                  sellerId: { type: 'string', nullable: true },
                  lastLoginAt: { type: 'string', format: 'date-time' },
                },
                required: ['id', 'status', 'isEmailVerified', 'roles'],
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  tokenType: { type: 'string', example: 'Bearer' },
                  expiresIn: { type: 'integer', example: 900 },
                  refreshExpiresIn: { type: 'integer', example: 604800 },
                },
                required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn'],
              },
              sessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
            },
            required: ['user', 'tokens', 'sessionId'],
          },
        },
        required: ['success', 'data'],
      },
      CurrentUserProfileResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              email: { type: 'string', example: 'tanvir@example.com' },
              phone: { type: 'string', example: '+8801700112233', nullable: true },
              name: { type: 'string', example: 'Tanvir Ahmed' },
              avatarUrl: { type: 'string', nullable: true },
              status: { type: 'string', example: 'ACTIVE' },
              isEmailVerified: { type: 'boolean', example: true },
              isPhoneVerified: { type: 'boolean', example: true },
              roles: { type: 'array', items: { type: 'string' }, example: ['CUSTOMER'] },
              permissions: { type: 'array', items: { type: 'string' } },
              sellerId: { type: 'string', nullable: true },
              wallets: {
                type: 'array',
                items: { $ref: '#/components/schemas/Wallet' },
              },
              pointAccount: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  availablePoints: { type: 'integer' },
                  pendingPoints: { type: 'integer' },
                  lifetimePoints: { type: 'integer' },
                },
              },
              lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
            },
            required: ['id', 'status', 'isEmailVerified', 'roles', 'wallets'],
          },
        },
        required: ['success', 'data'],
      },
      LanguageDefinition: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'bn' },
          name: { type: 'string', example: 'বাংলা' },
          nativeName: { type: 'string', example: 'বাংলা' },
          wordForLanguage: { type: 'string', example: 'ভাষা' },
          direction: { type: 'string', enum: ['ltr', 'rtl'], example: 'ltr' },
          isDefault: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true },
        },
        required: ['code', 'name', 'nativeName', 'wordForLanguage', 'direction', 'isDefault', 'isActive'],
      },
      LanguageListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              defaultLocale: { type: 'string', example: 'bn' },
              languages: {
                type: 'array',
                items: { $ref: '#/components/schemas/LanguageDefinition' },
              },
            },
            required: ['defaultLocale', 'languages'],
          },
        },
        required: ['success', 'data'],
      },
      AddLanguageRequest: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'ar' },
          name: { type: 'string', example: 'Arabic' },
          nativeName: { type: 'string', example: 'العربية' },
          wordForLanguage: { type: 'string', example: 'لغة' },
          direction: { type: 'string', enum: ['ltr', 'rtl'], default: 'ltr' },
          isActive: { type: 'boolean', default: true },
        },
        required: ['code', 'name', 'nativeName', 'wordForLanguage'],
      },
      SetDefaultLanguageRequest: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'en' },
        },
        required: ['code'],
      },
      UpdateLanguageRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Bengali' },
          nativeName: { type: 'string', example: 'বাংলা' },
          wordForLanguage: { type: 'string', example: 'ভাষা' },
          direction: { type: 'string', enum: ['ltr', 'rtl'] },
          isActive: { type: 'boolean' },
        },
      },
    },
  },
};

export function generateOpenApiJson(): void {
  const outputPath = resolve(process.cwd(), 'public/openapi.json');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2), 'utf-8');
  console.info(`[OpenAPI] Authoritative OpenAPI 3.1 specification generated at: ${outputPath}`);
}

// Execute when run directly via CLI
if (import.meta.main || process.argv[1]?.includes('generate-openapi')) {
  generateOpenApiJson();
}
