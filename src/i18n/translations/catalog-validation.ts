export interface CatalogValidationIssue {
  type: 'missing-key' | 'extra-key' | 'placeholder-mismatch' | 'empty-value';
  key: string;
  detail?: string;
}

type CatalogValue = string | { [key: string]: CatalogValue };

function flattenCatalog(value: CatalogValue, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      flattened[path] = child;
    } else if (child && typeof child === 'object') {
      Object.assign(flattened, flattenCatalog(child, path));
    }
  }

  return flattened;
}

function getPlaceholders(value: string): string[] {
  return [...value.matchAll(/\{([^}]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

/**
 * Validates that two locale catalogs expose the same message contract.
 * English is treated as the reference catalog; the function reports all
 * differences so CI can fail with an actionable list instead of one error.
 */
export function validateCatalogPair(
  referenceCatalog: CatalogValue,
  targetCatalog: CatalogValue
): CatalogValidationIssue[] {
  const reference = flattenCatalog(referenceCatalog);
  const target = flattenCatalog(targetCatalog);
  const issues: CatalogValidationIssue[] = [];

  for (const key of Object.keys(reference)) {
    if (!(key in target)) {
      issues.push({ type: 'missing-key', key });
      continue;
    }

    if (!target[key].trim()) {
      issues.push({ type: 'empty-value', key });
    }

    const expectedPlaceholders = getPlaceholders(reference[key]);
    const actualPlaceholders = getPlaceholders(target[key]);
    if (expectedPlaceholders.join('|') !== actualPlaceholders.join('|')) {
      issues.push({
        type: 'placeholder-mismatch',
        key,
        detail: `expected {${expectedPlaceholders.join(', ')}} but found {${actualPlaceholders.join(', ')}}`,
      });
    }
  }

  for (const key of Object.keys(target)) {
    if (!(key in reference)) {
      issues.push({ type: 'extra-key', key });
    }
  }

  return issues;
}

export function getCatalogLeafKeys(catalog: CatalogValue): string[] {
  return Object.keys(flattenCatalog(catalog)).sort();
}

export function getCatalogPlaceholders(value: string): string[] {
  return getPlaceholders(value);
}
