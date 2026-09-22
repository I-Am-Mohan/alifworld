/**
 * AlifWorld Admin User Seeding Script
 *
 * Seeds/upserts a platform super-admin user with:
 * - Email: itsmohan025@gmail.com
 * - Password: Admin123456 (PBKDF2 salted hash)
 * - Roles: SUPER_ADMIN, ADMIN
 * - Status: ACTIVE
 * - isEmailVerified: true
 * - isPhoneVerified: true
 *
 * Command: bun run seed:admin
 */

import { prisma, disconnectPrisma } from '../src/shared/database';
import { hashPassword } from '../src/shared/auth/password';
import { generateId, ID_PREFIXES } from '../src/shared/utils/id';

async function seedAdmin() {
  console.info('🚀 Starting admin user seed...');

  const adminEmail = 'itsmohan025@gmail.com';
  const adminPassword = 'Admin123456';
  const adminName = 'Platform Super Administrator (Mohan)';
  const adminPhone = '+8801700000025';

  const passwordHash = hashPassword(adminPassword);

  // 1. Ensure SUPER_ADMIN and ADMIN roles exist
  let superAdminRole = await (prisma as any).role.findUnique({
    where: { code: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    console.info('Creating SUPER_ADMIN role...');
    superAdminRole = await (prisma as any).role.create({
      data: {
        id: generateId(ID_PREFIXES.ROLE),
        code: 'SUPER_ADMIN',
        name: 'Super Administrator',
        description: 'Platform owner with unrestricted access across all contexts',
        isSystem: true,
      },
    });
  }

  let adminRole = await (prisma as any).role.findUnique({
    where: { code: 'ADMIN' },
  });

  if (!adminRole) {
    console.info('Creating ADMIN role...');
    adminRole = await (prisma as any).role.create({
      data: {
        id: generateId(ID_PREFIXES.ROLE),
        code: 'ADMIN',
        name: 'Platform Administrator',
        description: 'Administrative operator managing sellers, catalog, and compliance',
        isSystem: true,
      },
    });
  }

  // 2. Check if user already exists
  let user = await (prisma as any).user.findFirst({
    where: { email: adminEmail },
  });

  if (user) {
    console.info(`Found existing user with email ${adminEmail} (ID: ${user.id}). Updating credentials and status...`);
    user = await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        name: adminName,
        isEmailVerified: true,
        isPhoneVerified: true,
        deletedAt: null,
      },
    });
  } else {
    console.info(`Creating new admin user: ${adminEmail}...`);
    const userId = generateId(ID_PREFIXES.USER);
    user = await (prisma as any).user.create({
      data: {
        id: userId,
        email: adminEmail,
        phone: adminPhone,
        name: adminName,
        passwordHash,
        status: 'ACTIVE',
        isEmailVerified: true,
        isPhoneVerified: true,
        tokenVersion: 1,
        version: 1,
      },
    });
  }

  // 3. Ensure role assignments for SUPER_ADMIN and ADMIN
  const roleIdsToAssign = [superAdminRole.id, adminRole.id];
  for (const roleId of roleIdsToAssign) {
    const existingAssignment = await (prisma as any).userRoleAssignment.findFirst({
      where: {
        userId: user.id,
        roleId,
        sellerId: null,
      },
    });

    if (!existingAssignment) {
      await (prisma as any).userRoleAssignment.create({
        data: {
          id: generateId(ID_PREFIXES.ROLE_ASSIGNMENT),
          userId: user.id,
          roleId,
          sellerId: null,
          assignedBy: 'SYSTEM_SEED_ADMIN',
          version: 1,
        },
      });
      console.info(`Assigned role ID ${roleId} to user ${user.id}`);
    }
  }

  console.info('====================================================');
  console.info('✅ Admin User Successfully Seeded!');
  console.info(`📧 Email:    ${adminEmail}`);
  console.info(`🔑 Password: ${adminPassword}`);
  console.info(`👤 Name:     ${user.name}`);
  console.info(`🛡️ Roles:    SUPER_ADMIN, ADMIN`);
  console.info(`🆔 User ID:  ${user.id}`);
  console.info('====================================================');
}

seedAdmin()
  .catch((err) => {
    console.error('❌ Failed to seed admin user:', err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
