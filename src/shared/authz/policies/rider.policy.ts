/**
 * AlifWorld Delivery Rider & Logistics Authorization Policy
 * 
 * Enforces assignment lease validation, atomic acceptance to prevent double-assignment,
 * live GPS telemetry updates, shipment milestone transitions, and route isolation.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 046
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class RiderPolicy implements IPolicy {
  readonly name = 'RiderPolicy';
  readonly resourceType = 'RIDER';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    const isOperations = actor.roles.includes(SystemRoleCode.OPERATIONS);
    const isRider = actor.roles.includes(SystemRoleCode.RIDER);

    // 1. Super Administrator Global Operational Bypass
    if (isSuperAdmin) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds global logistics and dispatch privileges.',
        policyName: this.name,
      };
    }

    // 2. Dispatchers & Operations Global Logistics Access
    const isDispatcher = isPlatformAdmin || isOperations || actor.permissions.includes('rider:dispatch');

    switch (action) {
      case 'accept_assignment':
      case 'rider:assignment:accept':
      case 'rider:accept': {
        if (isDispatcher) {
          return { granted: true, code: 'GRANTED', reason: 'Dispatcher assigning delivery parcel.', policyName: this.name };
        }

        if (!isRider) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: 'Only registered and active delivery riders can accept assignments.',
            policyName: this.name,
          };
        }

        // Active status check
        if (actor.status !== 'ACTIVE') {
          return {
            granted: false,
            code: 'ACCOUNT_SUSPENDED',
            reason: 'Rider account is inactive or suspended. Cannot claim assignments.',
            policyName: this.name,
          };
        }

        // Invariant: Double-Assignment Prevention
        const existingRiderId = resource.data?.riderId || resource.ownerId;
        if (existingRiderId && existingRiderId !== actor.userId) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: 'Double-assignment prevented: Delivery parcel has already been claimed by another rider.',
            policyName: this.name,
            diagnostics: { claimedByRiderId: existingRiderId, attemptingRiderId: actor.userId },
          };
        }

        // Invariant: Exclusive Assignment Lease Validation
        const leaseRiderId = resource.data?.leaseRiderId;
        const leaseExpiresAt = resource.data?.leaseExpiresAt;

        if (leaseRiderId && leaseRiderId !== actor.userId) {
          // If the exclusive lease is held by another rider and hasn't expired yet
          const isLeaseActive = !leaseExpiresAt || new Date(leaseExpiresAt).getTime() > Date.now();
          if (isLeaseActive) {
            return {
              granted: false,
              code: 'FORBIDDEN',
              reason: 'Delivery assignment is held under an active exclusive lease by another rider.',
              policyName: this.name,
              diagnostics: { leaseRiderId, leaseExpiresAt },
            };
          }
        }

        if (leaseRiderId === actor.userId && leaseExpiresAt && new Date(leaseExpiresAt).getTime() < Date.now()) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: 'Delivery assignment lease has expired. Please refresh the dispatch feed.',
            policyName: this.name,
          };
        }

        return {
          granted: true,
          code: 'GRANTED',
          reason: 'Rider successfully authorized to atomically claim assignment lease.',
          policyName: this.name,
        };
      }

      case 'update_status':
      case 'rider:status:update':
      case 'rider:status': {
        if (isDispatcher) {
          return { granted: true, code: 'GRANTED', reason: 'Dispatcher updating parcel milestone status.', policyName: this.name };
        }

        if (!isRider) {
          return { granted: false, code: 'FORBIDDEN', reason: 'Non-rider cannot update delivery status.', policyName: this.name };
        }

        // Must be the assigned rider for this delivery
        const assignedRiderId = resource.data?.riderId || resource.ownerId;
        if (!assignedRiderId || assignedRiderId !== actor.userId) {
          return {
            granted: false,
            code: 'OWNERSHIP_VIOLATION',
            reason: 'Riders can only update status for shipments assigned to their active route.',
            policyName: this.name,
            diagnostics: { assignedRiderId, actorId: actor.userId },
          };
        }

        // Allowed rider milestone status transitions
        const targetStatus = resource.data?.status || resource.status;
        const allowedRiderStatuses = [
          'PICKED_UP',
          'IN_TRANSIT',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'FAILED_DELIVERY',
        ];

        if (targetStatus && !allowedRiderStatuses.includes(targetStatus)) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: `Riders cannot transition shipment directly to '${targetStatus}'. Administrative dispatch intervention required.`,
            policyName: this.name,
            diagnostics: { targetStatus, allowedRiderStatuses },
          };
        }

        return { granted: true, code: 'GRANTED', reason: 'Assigned rider authorized to update delivery status.', policyName: this.name };
      }

      case 'location_update':
      case 'rider:location':
      case 'rider:location:update': {
        // Rider reporting live GPS coordinates for route telemetry
        if (isRider) {
          const targetRiderId = resource.id || resource.data?.riderId;
          if (targetRiderId && targetRiderId !== actor.userId) {
            return {
              granted: false,
              code: 'OWNERSHIP_VIOLATION',
              reason: 'Cannot publish GPS coordinates for another rider.',
              policyName: this.name,
            };
          }
          return { granted: true, code: 'GRANTED', reason: 'Rider publishing telemetry coordinates.', policyName: this.name };
        }

        if (isDispatcher) {
          return { granted: true, code: 'GRANTED', reason: 'Dispatcher logging automated GPS telemetry.', policyName: this.name };
        }

        return { granted: false, code: 'FORBIDDEN', reason: 'Unauthorized to publish rider location telemetry.', policyName: this.name };
      }

      case 'read':
      case 'rider:read': {
        if (isDispatcher) {
          return { granted: true, code: 'GRANTED', reason: 'Dispatcher inspecting delivery assignments.', policyName: this.name };
        }

        if (!isRider) {
          return { granted: false, code: 'FORBIDDEN', reason: 'Unauthorized to view rider dispatch records.', policyName: this.name };
        }

        const assignedRiderId = resource.data?.riderId || resource.data?.leaseRiderId || resource.ownerId;
        if (!assignedRiderId || assignedRiderId === actor.userId) {
          return { granted: true, code: 'GRANTED', reason: 'Rider viewing assigned route or open dispatch.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Cannot inspect deliveries assigned to another rider.',
          policyName: this.name,
        };
      }

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized or unauthorized rider action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
