/**
 * AlifWorld OpenAPI 3.1 Specification Generator
 * Generates the authoritative REST API specification for mobile Flutter clients and third-party integrations.
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

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
      url: 'https://alifworld.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
    },
    {
      url: 'https://staging.alifworld.com',
      description: 'Staging Integration Server',
    },
    {
      url: 'https://api.alifworld.com',
      description: 'Production Cluster',
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
    '/api/v1/orders': {
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
    '/api/v1/seller/orders': {
      get: {
        tags: ['Order'],
        summary: 'List Seller Fulfillment Groups',
        description: 'Multi-tenant scoped query returning fulfillment groups and packing items exclusively belonging to the authenticated merchant.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of seller fulfillment groups',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
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
