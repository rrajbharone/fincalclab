export interface BreadcrumbItem {
  name?: string;
  label?: string;
  item?: string;
  path?: string;
  url?: string;
  position?: number;
}

export interface SchemaBreadcrumbList {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

export const SITE_URL = 'https://fincalclab.com';

/**
 * Normalizes any relative or absolute URL to an absolute canonical URL on fincalclab.com
 * with proper trailing slashes for directory paths.
 */
export function normalizeBreadcrumbUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  let urlStr = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    urlStr = `${SITE_URL}${cleanPath}`;
  }

  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const lastSlashIdx = pathname.lastIndexOf('/');
    const lastSegment = lastSlashIdx !== -1 ? pathname.substring(lastSlashIdx + 1) : pathname;
    if (!pathname.endsWith('/') && !lastSegment.includes('.')) {
      parsed.pathname = `${pathname}/`;
    }
    return parsed.toString();
  } catch {
    if (!urlStr.endsWith('/') && !/\.[a-z0-9]+$/i.test(urlStr)) {
      return `${urlStr}/`;
    }
    return urlStr;
  }
}

/**
 * Dynamically cleans a raw page title into a concise, human-readable calculator name.
 * e.g., "ADU Cost Calculator | Accessory Dwelling Unit Construction Cost Estimate | FinCalcLab"
 * -> "ADU Cost Calculator"
 */
export function extractCalculatorTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  const cleanTitle = rawTitle.replace(/\s*\|\s*FinCalcLab/gi, '').trim();
  const primaryPart = cleanTitle.split(/\s+[|\-–—]\s+/)[0]?.trim();
  return primaryPart && primaryPart.length > 2 ? primaryPart : cleanTitle;
}

/**
 * Generates the standardized BreadcrumbList schema for FinCalcLab.
 *
 * For any calculator page (/calculator/*), dynamically enforces:
 * 1. Home — https://fincalclab.com/
 * 2. All Calculators — https://fincalclab.com/all-calculators/
 * 3. Current Calculator — dynamic page title and canonical URL.
 *
 * For other pages with custom breadcrumbs (e.g., /blog/*, /all-calculators/),
 * validates and normalizes all breadcrumb URLs into absolute canonical URLs.
 */
export function generateBreadcrumbSchema(params: {
  pathname: string;
  title: string;
  canonicalUrl?: string;
  customBreadcrumbs?: BreadcrumbItem[];
}): SchemaBreadcrumbList | null {
  const { pathname, title, canonicalUrl, customBreadcrumbs } = params;

  // Detect whether this is an individual calculator page under /calculator/
  const isCalculatorPage = pathname.startsWith('/calculator/') && pathname.replace(/\/+$/, '') !== '/calculator';

  if (isCalculatorPage) {
    const pageCanonicalUrl = normalizeBreadcrumbUrl(canonicalUrl || `${SITE_URL}${pathname}`);
    const calculatorName = extractCalculatorTitle(title) || 'Financial Calculator';

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'All Calculators',
          item: `${SITE_URL}/all-calculators/`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: calculatorName,
          item: pageCanonicalUrl,
        },
      ],
    };
  }

  // Handle non-calculator pages with explicit custom breadcrumbs
  if (customBreadcrumbs && customBreadcrumbs.length > 0) {
    const validItems = customBreadcrumbs
      .map((crumb) => {
        const name = (crumb.name || crumb.label || '').trim();
        const rawUrl = crumb.item || crumb.path || crumb.url || '';
        const item = normalizeBreadcrumbUrl(rawUrl);
        return { name, item };
      })
      .filter((crumb) => crumb.name.length > 0 && crumb.item.length > 0);

    if (validItems.length > 0) {
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: validItems.map((crumb, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: crumb.name,
          item: crumb.item,
        })),
      };
    }
  }

  return null;
}
