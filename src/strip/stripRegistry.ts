import { CLOROX_SALT_POOL_STRIP } from './brands/cloroxSaltPool';
import type { StripBrandDefinition } from './types';

const STRIP_BRANDS: StripBrandDefinition[] = [CLOROX_SALT_POOL_STRIP];

const brandMap = new Map(STRIP_BRANDS.map((b) => [b.id, b]));

/** Default strip brand for Quick Check (only Clorox at launch) */
export const DEFAULT_STRIP_BRAND_ID = CLOROX_SALT_POOL_STRIP.id;

export function getStripBrand(id: string): StripBrandDefinition | undefined {
  return brandMap.get(id);
}

export function getDefaultStripBrand(): StripBrandDefinition {
  return CLOROX_SALT_POOL_STRIP;
}

export function listStripBrands(): StripBrandDefinition[] {
  return [...STRIP_BRANDS];
}
