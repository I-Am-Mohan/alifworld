import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { AuthTokenService } from '@/services/auth-token.service';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { DEFAULT_CURRENCIES, parseCurrencies } from '@/shared/types/currency';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();

const DEFAULT_SETUP_CONFIGS: Record<string, string> = {
  PLATFORM_TIMEZONE: 'Asia/Dhaka',
  PLATFORM_DEFAULT_LOCALE: 'bn-BD',
  PLATFORM_LOCALES: 'bn-BD,en-BD',
  PLATFORM_CURRENCY: 'BDT',
  PLATFORM_CURRENCIES: JSON.stringify(DEFAULT_CURRENCIES),
  STORAGE_PROVIDER: 'INTERNAL',
  STORAGE_S3_ENDPOINT: 'http://localhost:9000',
  STORAGE_S3_REGION: 'us-east-1',
  STORAGE_S3_BUCKET: 'alifworld-media',
  STORAGE_S3_ACCESS_KEY: 'minioadmin',
  STORAGE_S3_SECRET_KEY: 'minioadmin123',
  STORAGE_S3_CDN_URL: 'http://localhost:9000/alifworld-media',
  STORAGE_S3_FORCE_PATH_STYLE: 'true',
  PAYMENT_BKASH_ENABLED: 'true',
  PAYMENT_BKASH_ENV: 'sandbox',
  PAYMENT_BKASH_APP_KEY: 'bkash_test_app_key',
  PAYMENT_BKASH_APP_SECRET: 'bkash_test_app_secret',
  PAYMENT_BKASH_USERNAME: 'bkash_sandbox_user',
  PAYMENT_BKASH_PASSWORD: '••••••••',
  PAYMENT_BKASH_CALLBACK_URL: '/api/v1/payments/bkash/callback',
  PAYMENT_NAGAD_ENABLED: 'true',
  PAYMENT_NAGAD_ENV: 'sandbox',
  PAYMENT_NAGAD_MERCHANT_ID: 'NAGAD_SANDBOX_01',
  PAYMENT_NAGAD_PUBLIC_KEY: 'nagad_pub_key_placeholder',
  PAYMENT_NAGAD_PRIVATE_KEY: '••••••••',
  COURIER_PATHAO_ENABLED: 'true',
  COURIER_PATHAO_ENV: 'sandbox',
  COURIER_PATHAO_CLIENT_ID: 'pathao_client_id_dev',
  COURIER_PATHAO_CLIENT_SECRET: '••••••••',
  COURIER_PATHAO_USERNAME: 'pathao@alifworld.com',
  COURIER_PATHAO_PASSWORD: '••••••••',
  COURIER_PATHAO_STORE_ID: '12480',
  COURIER_REDX_ENABLED: 'true',
  COURIER_REDX_ENV: 'sandbox',
  COURIER_REDX_ACCESS_TOKEN: 'redx_access_token_demo',
  COURIER_REDX_STORE_ID: 'redx_store_dhaka_01',
  COURIER_STEADFAST_ENABLED: 'true',
  COURIER_STEADFAST_ENV: 'sandbox',
  COURIER_STEADFAST_API_KEY: 'stf_api_key_sample',
  COURIER_STEADFAST_SECRET_KEY: '••••••••',
  COURIER_DEFAULT_PROVIDER: 'PATHAO',
  SMS_GATEWAY_PROVIDER: 'GREENWEB',
  SMS_GATEWAY_API_KEY: 'greenweb_token_demo_sample',
  SMS_GATEWAY_SENDER_ID: 'ALIFWORLD',
  SMS_GATEWAY_ENDPOINT: 'https://api.greenweb.com.bd/api.php',
  FEATURE_COD_ENABLED: 'true',
  FEATURE_POINTS_REWARDS_ENABLED: 'true',
  FEATURE_POINTS_CASH_CONVERTIBLE: 'false',
  FEATURE_REFERRAL_ENABLED: 'true',
  FEATURE_SELLER_REGISTRATION_ENABLED: 'true',
  FEATURE_MULTIVENDOR_CHECKOUT: 'true',
  FEATURE_MAINTENANCE_MODE: 'false',
  FEATURE_CART_TTL_AUTO_CANCEL: 'true',
};

/**
 * GET /api/v1/system/setup
 * Returns current platform operational settings.
 */
export async function GET() {
  try {
    const records = await prisma.systemConfig.findMany({
      where: { deletedAt: null },
    });

    const configMap: Record<string, string> = { ...DEFAULT_SETUP_CONFIGS };
    for (const record of records) {
      configMap[record.key] = record.value;
    }

    // Ensure PLATFORM_CURRENCIES is always valid JSON
    if (configMap.PLATFORM_CURRENCIES) {
      try {
        const parsed = JSON.parse(configMap.PLATFORM_CURRENCIES);
        if (!Array.isArray(parsed)) {
          configMap.PLATFORM_CURRENCIES = JSON.stringify(parseCurrencies(configMap.PLATFORM_CURRENCIES));
        }
      } catch {
        configMap.PLATFORM_CURRENCIES = JSON.stringify(parseCurrencies(configMap.PLATFORM_CURRENCIES));
      }
    }

    return NextResponse.json({
      success: true,
      data: configMap,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/system/setup
 * Updates platform operational settings (Admin protected).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authTokenService.authenticateRequest(req).catch(() => null);
    if (!auth || (!auth.user.roles.includes('SUPER_ADMIN') && !auth.user.roles.includes('ADMIN'))) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Administrative authorization required' },
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_FAILED', message: 'Payload must be a settings key-value object' },
        },
        { status: 422 }
      );
    }

    const updatedKeys: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const [key, rawValue] of Object.entries(body)) {
        if (typeof key !== 'string' || key.length === 0) continue;
        const value = typeof rawValue === 'object' && rawValue !== null
          ? JSON.stringify(rawValue)
          : String(rawValue);

        await tx.systemConfig.upsert({
          where: { key },
          update: {
            value,
            updatedBy: auth.user.id,
          },
          create: {
            id: generateId(ID_PREFIXES.CONFIG),
            key,
            value,
            description: `Configured via Admin Setup by ${auth.user.email || auth.user.id}`,
            isPublic: false,
          },
        });
        updatedKeys.push(key);
      }

      await tx.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: auth.user.id,
          actorRole: auth.user.roles[0] || 'SUPER_ADMIN',
          action: 'PLATFORM_SETUP_UPDATED',
          resource: 'SystemConfig',
          resourceId: 'SETUP_CONFIGURATION',
          metadata: {
            updatedCount: updatedKeys.length,
            updatedKeys,
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Settings updated successfully',
        updatedKeys,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update setup' },
      },
      { status: 500 }
    );
  }
}
