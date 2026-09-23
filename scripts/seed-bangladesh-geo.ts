import { prisma } from '@/shared/database/prisma';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS,
  BANGLADESH_UPAZILAS,
} from '@/shared/geo/bangladesh-geo';

async function main() {
  for (const division of BANGLADESH_DIVISIONS) {
    await (prisma as any).geoDivision.upsert({
      where: { id: division.id },
      create: {
        id: division.id,
        code: division.code,
        nameEn: division.nameEn,
        nameBn: division.nameBn,
        headquarters: division.headquarters,
      },
      update: {
        code: division.code,
        nameEn: division.nameEn,
        nameBn: division.nameBn,
        headquarters: division.headquarters,
        isActive: true,
        version: { increment: 1 },
      },
    });
  }

  for (const district of BANGLADESH_DISTRICTS) {
    await (prisma as any).geoDistrict.upsert({
      where: { id: district.id },
      create: district,
      update: {
        divisionCode: district.divisionCode,
        nameEn: district.nameEn,
        nameBn: district.nameBn,
        postalCodePrefix: district.postalCodePrefix,
        isActive: true,
        version: { increment: 1 },
      },
    });
  }

  for (const upazila of BANGLADESH_UPAZILAS) {
    await (prisma as any).geoUpazila.upsert({
      where: { id: upazila.id },
      create: { ...upazila, level: 'UPAZILA' },
      update: {
        districtId: upazila.districtId,
        nameEn: upazila.nameEn,
        nameBn: upazila.nameBn,
        postalCode: upazila.postalCode,
        isActive: true,
        version: { increment: 1 },
      },
    });
  }

  console.info(`[geo] seeded ${BANGLADESH_DIVISIONS.length} divisions, ${BANGLADESH_DISTRICTS.length} districts, ${BANGLADESH_UPAZILAS.length} upazilas/thanas`);
}

main()
  .catch((error) => {
    console.error('[geo] seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
