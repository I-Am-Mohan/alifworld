import { z } from 'zod';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';
import {
  getBangladeshDivision,
  getBangladeshDistrict,
  getBangladeshUpazilas,
} from '@/shared/geo/bangladesh-geo';

export const CustomerAddressInputSchema = z.object({
  label: z.string().trim().min(1).max(50),
  recipientName: z.string().trim().min(2).max(100),
  recipientPhone: z.string().trim().min(8).transform(normalizeBangladeshPhone),
  divisionCode: z.string().trim().min(2),
  districtId: z.string().trim().min(2),
  upazilaId: z.string().trim().min(2).optional().nullable(),
  addressLine: z.string().trim().min(5).max(255),
  postalCode: z.string().trim().regex(/^\d{4}$/).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export type CustomerAddressInput = z.infer<typeof CustomerAddressInputSchema>;

export function validateAddressHierarchy(input: CustomerAddressInput): CustomerAddressInput {
  const division = getBangladeshDivision(input.divisionCode);
  if (!division) throw new Error(`Unknown Bangladesh division: '${input.divisionCode}'.`);

  const district = getBangladeshDistrict(input.districtId);
  if (!district || district.divisionCode !== division.code) {
    throw new Error(`District '${input.districtId}' does not belong to division '${division.code}'.`);
  }

  if (input.upazilaId) {
    const upazila = getBangladeshUpazilas(input.districtId).find((item) => item.id === input.upazilaId);
    if (!upazila || upazila.districtId !== district.id) {
      throw new Error(`Upazila/thana '${input.upazilaId}' does not belong to district '${district.id}'.`);
    }
  }

  return {
    ...input,
    divisionCode: division.code,
    districtId: district.id,
  };
}
