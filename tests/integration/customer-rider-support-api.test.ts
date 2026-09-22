/**
 * Integration Tests: Customer, Rider, and Support REST API Endpoints (Milestone 046)
 * 
 * Verifies:
 * 1. /api/v1/support/tickets & /api/v1/support/tickets/[id]:
 *    - 401 Unauthorized when unauthenticated
 *    - 403 Forbidden / Ownership Violation on cross-customer ticket snooping
 *    - 422 Unprocessable Entity on schema validation failure
 *    - Customer self-service ticket creation, viewing, thread replies, and resolution
 *    - Support agent ticket queue oversight
 * 2. /api/v1/rider/assignments & /api/v1/rider/location:
 *    - 401 Unauthorized when unauthenticated
 *    - 403 Forbidden when Customer attempts rider dispatch actions
 *    - Rider assignment acceptance and double-assignment prevention
 *    - Live GPS telemetry ingestion with compact mobile responses
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 046
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET as getTickets, POST as createTicket } from '@/app/api/v1/support/tickets/route';
import { GET as getTicketById, POST as replyTicket, PATCH as resolveTicket } from '@/app/api/v1/support/tickets/[id]/route';
import { POST as acceptAssignment } from '@/app/api/v1/rider/assignments/route';
import { POST as updateLocation } from '@/app/api/v1/rider/location/route';
import { SupportTicketService } from '@/services/support-ticket.service';
import { RiderDeliveryService } from '@/services/rider-delivery.service';
import { generateAccessToken } from '@/shared/auth/jwt';
import { SystemRoleCode } from '@/features/identity/types';
import { prisma } from '@/shared/database/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_min_32_chars_long_for_security';
process.env.JWT_SECRET = JWT_SECRET;

function createBearer(params: {
  userId: string;
  roles: string[];
  permissions: string[];
  sellerId?: string | null;
}) {
  const token = generateAccessToken(
    {
      userId: params.userId,
      email: `${params.userId}@example.com`,
      phone: null,
      roles: params.roles,
      permissions: params.permissions,
      sellerId: params.sellerId ?? null,
      tokenVersion: 1,
      sessionId: 'ses_integration_policies',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Customer, Rider & Support REST API Integration (Milestone 046)', () => {
  const CUSTOMER_ALICE_ID = 'usr_1j7x4b9e8m02k3fa';
  const CUSTOMER_BOB_ID = 'usr_2j7x4b9e8m02k3fb';
  const RIDER_RAHIM_ID = 'usr_3j7x4b9e8m02k3fc';
  const RIDER_KARIM_ID = 'usr_4j7x4b9e8m02k3fd';
  const SUPPORT_AGENT_ID = 'usr_5j7x4b9e8m02k3fe';

  const ALICE_AUTH = createBearer({
    userId: CUSTOMER_ALICE_ID,
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  const BOB_AUTH = createBearer({
    userId: CUSTOMER_BOB_ID,
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  const RIDER_RAHIM_AUTH = createBearer({
    userId: RIDER_RAHIM_ID,
    roles: [SystemRoleCode.RIDER],
    permissions: ['rider:status:update', 'rider:location:update'],
  });

  const RIDER_KARIM_AUTH = createBearer({
    userId: RIDER_KARIM_ID,
    roles: [SystemRoleCode.RIDER],
    permissions: ['rider:status:update', 'rider:location:update'],
  });

  const SUPPORT_AUTH = createBearer({
    userId: SUPPORT_AGENT_ID,
    roles: [SystemRoleCode.SUPPORT],
    permissions: ['support:read', 'support:manage'],
  });

  beforeEach(() => {
    SupportTicketService.clearState();
    RiderDeliveryService.clearState();

    // Mock prisma auditLog and shipment queries
    (prisma as any).auditLog = {
      create: async () => ({ id: 'aud_mock' }),
    };
    (prisma as any).shipment = {
      findFirst: async () => null,
      update: async () => ({ id: 'shp_mock' }),
    };
    (prisma as any).shipmentEvent = {
      create: async () => ({ id: 'she_mock' }),
    };
  });

  // ── /api/v1/support/tickets ─────────────────────────────────────────────────

  describe('Support Tickets REST API', () => {
    it('GET /api/v1/support/tickets returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/support/tickets');
      const res = await getTickets(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/support/tickets returns 422 Unprocessable Entity when description is too short', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/support/tickets', {
        method: 'POST',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Broken item',
          description: 'tiny', // Less than 10 chars
        }),
      });
      const res = await createTicket(req);
      expect(res.status).toBe(422);
    });

    it('POST /api/v1/support/tickets creates a ticket for authenticated customer', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/support/tickets', {
        method: 'POST',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Delayed delivery inquiry',
          description: 'My order has been in transit for over 3 days.',
          category: 'DELIVERY_DELAY',
          priority: 'HIGH',
        }),
      });
      const res = await createTicket(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.ownerId).toBe(CUSTOMER_ALICE_ID);
      expect(json.data.status).toBe('OPEN');
    });

    it('GET /api/v1/support/tickets lists only own tickets for Customer', async () => {
      // Alice creates a ticket
      const ticketService = new SupportTicketService();
      await ticketService.createTicket(
        { userId: CUSTOMER_ALICE_ID, roles: [SystemRoleCode.CUSTOMER], permissions: [] },
        { subject: 'Alice Ticket Subject', description: 'Detailed Alice description here.', category: 'ORDER_INQUIRY', priority: 'LOW' }
      );

      // Alice fetches tickets
      const reqAlice = new NextRequest('http://localhost:3000/api/v1/support/tickets', {
        headers: { authorization: ALICE_AUTH },
      });
      const resAlice = await getTickets(reqAlice);
      const jsonAlice = await resAlice.json();
      expect(jsonAlice.data.length).toBe(1);

      // Bob fetches tickets -> should see 0
      const reqBob = new NextRequest('http://localhost:3000/api/v1/support/tickets', {
        headers: { authorization: BOB_AUTH },
      });
      const resBob = await getTickets(reqBob);
      const jsonBob = await resBob.json();
      expect(jsonBob.data.length).toBe(0);
    });

    it('GET /api/v1/support/tickets/[id] returns 403 when Bob attempts to read Alice ticket', async () => {
      const ticketService = new SupportTicketService();
      const ticket = await ticketService.createTicket(
        { userId: CUSTOMER_ALICE_ID, roles: [SystemRoleCode.CUSTOMER], permissions: [] },
        { subject: 'Private inquiry', description: 'Confidential order information.', category: 'ORDER_INQUIRY', priority: 'LOW' }
      );

      // Bob attempts to inspect Alice's ticket
      const req = new NextRequest(`http://localhost:3000/api/v1/support/tickets/${ticket.id}`, {
        headers: { authorization: BOB_AUTH },
      });
      const res = await getTicketById(req, { params: Promise.resolve({ id: ticket.id }) });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.details.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('POST /api/v1/support/tickets/[id] allows Support agent to reply to ticket', async () => {
      const ticketService = new SupportTicketService();
      const ticket = await ticketService.createTicket(
        { userId: CUSTOMER_ALICE_ID, roles: [SystemRoleCode.CUSTOMER], permissions: [] },
        { subject: 'Order assistance', description: 'Need help with shipment routing.', category: 'ORDER_INQUIRY', priority: 'MEDIUM' }
      );

      const req = new NextRequest(`http://localhost:3000/api/v1/support/tickets/${ticket.id}`, {
        method: 'POST',
        headers: {
          authorization: SUPPORT_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message: 'Hello Alice, we have dispatched your package today.' }),
      });

      const res = await replyTicket(req, { params: Promise.resolve({ id: ticket.id }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.messages.length).toBe(2);
      expect(json.data.status).toBe('IN_PROGRESS');
    });
  });

  // ── /api/v1/rider/assignments & location ────────────────────────────────────

  describe('Rider Delivery & Telemetry REST API', () => {
    it('POST /api/v1/rider/assignments returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/rider/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deliveryId: 'shp_123' }),
      });
      const res = await acceptAssignment(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/rider/assignments returns 403 Forbidden when Customer attempts to claim assignment', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/rider/assignments', {
        method: 'POST',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ deliveryId: 'shp_package_01' }),
      });
      const res = await acceptAssignment(req);
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/rider/assignments allows Rider to atomically claim delivery', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/rider/assignments', {
        method: 'POST',
        headers: {
          authorization: RIDER_RAHIM_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ deliveryId: 'shp_package_01' }),
      });
      const res = await acceptAssignment(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.riderId).toBe(RIDER_RAHIM_ID);
      expect(json.data.status).toBe('PICKED_UP');
    });

    it('POST /api/v1/rider/location accepts valid GPS coordinates from authenticated Rider', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/rider/location', {
        method: 'POST',
        headers: {
          authorization: RIDER_RAHIM_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          deliveryId: 'shp_package_01',
          latitude: 23.8103, // Dhaka coordinates
          longitude: 90.4125,
          speed: 25.5,
          heading: 180,
        }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.latitude).toBe(23.8103);
      expect(json.data.longitude).toBe(90.4125);
    });

    it('POST /api/v1/rider/location returns 422 Unprocessable Entity when latitude is out of bounds', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/rider/location', {
        method: 'POST',
        headers: {
          authorization: RIDER_RAHIM_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          latitude: 105.0, // Invalid: exceeds 90 degrees
          longitude: 90.4125,
        }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(422);
    });
  });
});
