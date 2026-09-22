/**
 * AlifWorld Canonical Environment Configuration & Validation Module
 * Reference: docs/architecture/environment-branching-and-release-strategy.md
 */

import { Poisha, toPoisha } from '../types/domain-terms';

export type AppEnvironmentTier = 'local' | 'development' | 'staging' | 'production';

export interface ComplianceGateConfig {
  /** GATE-01: Multi-Tier Referral prevention (strictly false by default) */
  readonly featureAffiliateMultiTierEnabled: boolean;
  /** GATE-01: Maximum allowed affiliate tree depth (locked to 1) */
  readonly maxAffiliateDepth: number;
  /** GATE-02: Good-Luck Lottery / games of chance (strictly false) */
  readonly featureLotteryEnabled: boolean;
  /** GATE-03: MFS Direct Debit & automated recurring debit */
  readonly featureMfsDirectDebitEnabled: boolean;
  /** GATE-04: Automated NBR VAT Mushak-6.3 tax submission */
  readonly featureNbrTaxIntegrationEnabled: boolean;
  /** GATE-05: Dual-operator Maker-Checker for high-value payouts */
  readonly featureMakerCheckerPayoutEnabled: boolean;
  /** GATE-05: Payout threshold in Poisha requiring dual-authorization (50,000 BDT) */
  readonly makerCheckerThresholdPoisha: Poisha;
  /** GATE-06: Conversion of Product Points into cash (Hard-locked to false) */
  readonly featurePointsCashConvertible: boolean;
  /** GATE-07: Advanced Shopping term deposits (strictly false) */
  readonly featureAdvancedShoppingEnabled: boolean;
}

export interface AppConfig {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly appEnv: AppEnvironmentTier;
  readonly port: number;
  readonly appUrl: string;
  readonly apiUrl: string;
  readonly publicAppUrl: string;
  readonly publicCdnUrl: string;
  
  readonly timezone: 'Asia/Dhaka';
  readonly defaultLocale: 'bn-BD';
  readonly supportedLocales: readonly ['en-BD', 'bn-BD'];
  readonly baseCurrency: 'BDT';

  readonly database: {
    readonly url: string;
    readonly directUrl?: string;
    readonly poolMin: number;
    readonly poolMax: number;
  };

  readonly redis: {
    readonly url: string;
    readonly keyPrefix: string;
    readonly tlsEnabled: boolean;
  };

  readonly storage: {
    readonly endpoint: string;
    readonly region: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly bucketName: string;
    readonly forcePathStyle: boolean;
    readonly publicBaseUrl: string;
  };

  readonly meilisearch: {
    readonly host: string;
    readonly apiKey: string;
    readonly indexPrefix: string;
  };

  readonly gates: ComplianceGateConfig;
}

/**
 * Validates and returns the strongly-typed application configuration.
 * Enforces fail-safe regulatory defaults across all environments.
 */
export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
  const rawAppEnv = env.APP_ENV || (nodeEnv === 'production' ? 'production' : 'local');
  
  const validTiers: AppEnvironmentTier[] = ['local', 'development', 'staging', 'production'];
  const appEnv: AppEnvironmentTier = validTiers.includes(rawAppEnv as AppEnvironmentTier)
    ? (rawAppEnv as AppEnvironmentTier)
    : 'local';

  // Strict Compliance Invariant: Points are NEVER cash convertible
  const pointsCashConvertible = env.FEATURE_POINTS_CASH_CONVERTIBLE === 'true';
  if (pointsCashConvertible) {
    throw new Error(
      'COMPLIANCE VIOLATION (GATE-06): Product Points cannot be configured as cash convertible.'
    );
  }

  // Strict Compliance Invariant: Multi-tier referrals prohibited without licensing
  const affiliateDepth = parseInt(env.MAX_AFFILIATE_DEPTH || '1', 10);
  const multiTierEnabled = env.FEATURE_AFFILIATE_MULTI_TIER_ENABLED === 'true';
  if (affiliateDepth > 1 && !multiTierEnabled) {
    throw new Error(
      'COMPLIANCE VIOLATION (GATE-01): MAX_AFFILIATE_DEPTH > 1 requires explicit regulatory compliance.'
    );
  }

  const makerCheckerThresholdPoisha = env.MAKER_CHECKER_THRESHOLD_POISHA
    ? (parseInt(env.MAKER_CHECKER_THRESHOLD_POISHA, 10) as Poisha)
    : toPoisha(50000); // 50,000 BDT default

  return {
    nodeEnv,
    appEnv,
    port: parseInt(env.PORT || '3000', 10),
    appUrl: env.APP_URL || 'http://localhost:3000',
    apiUrl: env.API_URL || 'http://localhost:3000/api/v1',
    publicAppUrl: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    publicCdnUrl: env.NEXT_PUBLIC_CDN_URL || 'http://localhost:9000/alifworld-media',

    timezone: 'Asia/Dhaka',
    defaultLocale: 'bn-BD',
    supportedLocales: ['en-BD', 'bn-BD'] as const,
    baseCurrency: 'BDT',

    database: {
      url: env.DATABASE_URL || 'postgresql://alifworld:alifworld_local_secret@localhost:5432/alifworld_dev',
      directUrl: env.DIRECT_DATABASE_URL,
      poolMin: parseInt(env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(env.DATABASE_POOL_MAX || '10', 10),
    },

    redis: {
      url: env.REDIS_URL || 'redis://localhost:6379/0',
      keyPrefix: env.REDIS_KEY_PREFIX || 'alif:',
      tlsEnabled: env.REDIS_TLS_ENABLED === 'true',
    },

    storage: {
      endpoint: env.S3_ENDPOINT || 'http://localhost:9000',
      region: env.S3_REGION || 'us-east-1',
      accessKeyId: env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY || 'minioadmin',
      bucketName: env.S3_BUCKET_NAME || 'alifworld-media',
      forcePathStyle: env.S3_FORCE_PATH_STYLE !== 'false',
      publicBaseUrl: env.S3_PUBLIC_BASE_URL || 'http://localhost:9000/alifworld-media',
    },

    meilisearch: {
      host: env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: env.MEILISEARCH_API_KEY || '',
      indexPrefix: env.MEILISEARCH_INDEX_PREFIX || 'alif_',
    },

    gates: {
      featureAffiliateMultiTierEnabled: multiTierEnabled,
      maxAffiliateDepth: affiliateDepth,
      featureLotteryEnabled: env.FEATURE_LOTTERY_ENABLED === 'true',
      featureMfsDirectDebitEnabled: env.FEATURE_MFS_DIRECT_DEBIT_ENABLED === 'true',
      featureNbrTaxIntegrationEnabled: env.FEATURE_NBR_TAX_INTEGRATION_ENABLED === 'true',
      featureMakerCheckerPayoutEnabled: env.FEATURE_MAKER_CHECKER_PAYOUT_ENABLED !== 'false',
      makerCheckerThresholdPoisha,
      featurePointsCashConvertible: false, // Invariant locked
      featureAdvancedShoppingEnabled: env.FEATURE_ADVANCED_SHOPPING_ENABLED === 'true',
    },
  };
}
