/**
 * Unit Tests for User, Role, Permission Domain Modeling and Validators
 * 
 * Verifies ID prefixes, domain validation schemas, case-normalization,
 * and constraint rules.
 * 
 * Reference: docs/architecture/identifiers-lifecycle-and-deletion-policy.md
 * Invariant: ADR-0022, ADR-0023
 */

import { describe, it, expect } from 'bun:test';
import { generateId, isValidId, extractPrefix, ID_PREFIXES } from '@/shared/utils/id';
import {
  CreateUserInputSchema,
  UpdateUserInputSchema,
  CreateRoleInputSchema,
  CreatePermissionInputSchema,
  AssignRoleInputSchema,
} from '@/features/identity/validators';
import { SystemRoleCode, PermissionModule } from '@/features/identity/types';

describe('IAM Identifiers & Prefixes Unit Tests', () => {
  it('generates role, permission, and role assignment IDs with standardized prefixes', () => {
    const roleId = generateId(ID_PREFIXES.ROLE);
    expect(roleId.startsWith('rol_')).toBe(true);
    expect(isValidId(roleId, ID_PREFIXES.ROLE)).toBe(true);
    expect(extractPrefix(roleId)).toBe('rol');

    const permId = generateId(ID_PREFIXES.PERMISSION);
    expect(permId.startsWith('prm_')).toBe(true);
    expect(isValidId(permId, ID_PREFIXES.PERMISSION)).toBe(true);
    expect(extractPrefix(permId)).toBe('prm');

    const rpId = generateId(ID_PREFIXES.ROLE_PERMISSION);
    expect(rpId.startsWith('rpm_')).toBe(true);
    expect(isValidId(rpId, ID_PREFIXES.ROLE_PERMISSION)).toBe(true);

    const uraId = generateId(ID_PREFIXES.ROLE_ASSIGNMENT);
    expect(uraId.startsWith('ura_')).toBe(true);
    expect(isValidId(uraId, ID_PREFIXES.ROLE_ASSIGNMENT)).toBe(true);
    expect(extractPrefix(uraId)).toBe('ura');
  });
});

describe('IAM Zod Input Validation Schemas', () => {
  it('validates CreateUserInput with email', () => {
    const parsed = CreateUserInputSchema.parse({
      email: 'Customer@Example.COM ',
      name: 'Rahim Khan',
    });

    expect(parsed.email).toBe('customer@example.com');
    expect(parsed.name).toBe('Rahim Khan');
    expect(parsed.initialRoleCode).toBe(SystemRoleCode.CUSTOMER);
  });

  it('validates CreateUserInput with Bangladesh phone number and normalizes it', () => {
    const parsed = CreateUserInputSchema.parse({
      phone: '01712-345678',
      name: 'Farhana Sultana',
    });

    expect(parsed.phone).toBe('+8801712345678');
    expect(parsed.initialRoleCode).toBe(SystemRoleCode.CUSTOMER);
  });

  it('rejects CreateUserInput when neither email nor phone is provided', () => {
    expect(() => {
      CreateUserInputSchema.parse({
        name: 'No Contact User',
      });
    }).toThrow();
  });

  it('validates UpdateUserInput requiring optimistic concurrency version', () => {
    const valid = UpdateUserInputSchema.parse({
      name: 'Updated Name',
      version: 2,
    });
    expect(valid.name).toBe('Updated Name');
    expect(valid.version).toBe(2);

    // Missing version
    expect(() => {
      UpdateUserInputSchema.parse({
        name: 'Missing Version',
      });
    }).toThrow();
  });

  it('validates CreateRoleInput with uppercase role code formatting', () => {
    const parsed = CreateRoleInputSchema.parse({
      code: 'warehouse_picker',
      name: 'Warehouse Picker',
      permissionCodes: ['orders:read', 'orders:manage'],
    });

    expect(parsed.code).toBe('WAREHOUSE_PICKER');
    expect(parsed.permissionCodes.length).toBe(2);
  });

  it('rejects invalid role codes with special characters', () => {
    expect(() => {
      CreateRoleInputSchema.parse({
        code: 'bad-role-code!',
        name: 'Bad Role',
      });
    }).toThrow();
  });

  it('validates CreatePermissionInput enforcing "module:action" slug pattern', () => {
    const parsed = CreatePermissionInputSchema.parse({
      code: 'SELLERS:VERIFY',
      name: 'Verify Sellers',
      module: PermissionModule.SELLER,
    });

    expect(parsed.code).toBe('sellers:verify');
    expect(parsed.module).toBe(PermissionModule.SELLER);
  });

  it('rejects permission code without colon separator', () => {
    expect(() => {
      CreatePermissionInputSchema.parse({
        code: 'invalid_code',
        name: 'Invalid',
        module: PermissionModule.IAM,
      });
    }).toThrow();
  });

  it('validates AssignRoleInput requiring standardized user and role IDs', () => {
    const userId = generateId(ID_PREFIXES.USER);
    const roleId = generateId(ID_PREFIXES.ROLE);
    const sellerId = generateId(ID_PREFIXES.SELLER);

    const parsed = AssignRoleInputSchema.parse({
      userId,
      roleId,
      sellerId,
    });

    expect(parsed.userId).toBe(userId);
    expect(parsed.roleId).toBe(roleId);
    expect(parsed.sellerId).toBe(sellerId);
  });

  it('rejects AssignRoleInput with malformed ID strings', () => {
    expect(() => {
      AssignRoleInputSchema.parse({
        userId: 'invalid_usr_string',
        roleId: generateId(ID_PREFIXES.ROLE),
      });
    }).toThrow();
  });
});
