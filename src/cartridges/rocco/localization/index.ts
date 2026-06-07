import { roccoEnglishText } from './en';
import { roccoSpanishText } from './es';
import {
  ROCCO_DEFAULT_LOCALE,
  ROCCO_SUPPORTED_LOCALES,
  type RoccoLocale,
  type RoccoLocalization,
  type RoccoTextCatalog,
} from './types';

export {
  ROCCO_DEFAULT_LOCALE,
  ROCCO_SUPPORTED_LOCALES,
  type RoccoLocale,
  type RoccoLocalization,
  type RoccoLocalizedManifestText,
  type RoccoTextCatalog,
} from './types';

export const ROCCO_TEXT_BY_LOCALE: Record<RoccoLocale, RoccoTextCatalog> = {
  en: roccoEnglishText,
  es: roccoSpanishText,
};

export function resolveRoccoLocale(locale: string | undefined): RoccoLocale {
  return ROCCO_SUPPORTED_LOCALES.includes(locale as RoccoLocale)
    ? (locale as RoccoLocale)
    : ROCCO_DEFAULT_LOCALE;
}

export function createRoccoLocalization(locale?: string): RoccoLocalization {
  const resolvedLocale = resolveRoccoLocale(locale);
  return {
    locale: resolvedLocale,
    text: ROCCO_TEXT_BY_LOCALE[resolvedLocale],
  };
}
