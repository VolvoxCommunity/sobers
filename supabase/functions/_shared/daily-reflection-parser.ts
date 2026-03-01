// =============================================================================
// Types
// =============================================================================

export interface ParsedDailyReflection {
  monthDay: string;
  title: string;
  content: string;
  source: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const ARTICLE_DATE_PATTERN = /data-date=["'](\d{2}-\d{2})["']/i;
const TITLE_PATTERN = /<h3[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h3>/i;
const BODY_SECTION_PATTERN = /field--name-body[\s\S]*?field__item[^>]*>([\s\S]*?)<\/div>/i;
const TEASER_SECTION_PATTERN =
  /field--name-field-teaser[\s\S]*?field__item[^>]*>([\s\S]*?)<\/div>/i;
const PARAGRAPH_PATTERN = /<p[^>]*>([\s\S]*?)<\/p>/gi;
const SOURCE_PATTERN = /,\s*p\.\s*\d+/i;

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#x27': "'",
  '#x2F': '/',
  '#60': '`',
  '#x60': '`',
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Decode HTML entities into display characters.
 *
 * @param value - Input text containing entities
 * @returns Decoded text
 */
function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    const normalizedEntity = entity.toLowerCase();
    if (HTML_ENTITY_MAP[normalizedEntity]) {
      return HTML_ENTITY_MAP[normalizedEntity];
    }

    if (normalizedEntity.startsWith('#x')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(2), 16);
      if (!Number.isNaN(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
    }

    if (normalizedEntity.startsWith('#')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(1), 10);
      if (!Number.isNaN(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
    }

    return match;
  });
}

/**
 * Remove markup and normalize spacing from an HTML fragment.
 *
 * @param fragment - HTML fragment string
 * @returns Plain-text fragment
 */
function cleanHtmlFragment(fragment: string): string {
  const withLineBreaks = fragment.replace(/<br\s*\/?>/gi, '\n');
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, ' ');
  const decoded = decodeHtmlEntities(withoutTags);
  return decoded
    .replace(/\r/g, '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Extract paragraph blocks from a body section and normalize to plain text.
 *
 * @param sectionHtml - HTML section containing paragraph content
 * @returns List of plain-text paragraphs
 */
function extractParagraphs(sectionHtml: string): string[] {
  const paragraphs = Array.from(sectionHtml.matchAll(PARAGRAPH_PATTERN))
    .map((match) => cleanHtmlFragment(match[1] ?? ''))
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  const fallbackParagraph = cleanHtmlFragment(sectionHtml);
  return fallbackParagraph ? [fallbackParagraph] : [];
}

/**
 * Validate that value is a non-null object.
 *
 * @param value - Unknown value
 * @returns True when value is an object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse AA API payload into normalized reflection content.
 *
 * @param payload - JSON payload from aa.org reflections API
 * @param expectedMonthDay - Expected MM-DD value for request validation
 * @returns Parsed reflection content
 * @throws Error when payload is malformed or doesn't match requested date
 */
export function parseDailyReflectionPayload(
  payload: unknown,
  expectedMonthDay: string
): ParsedDailyReflection {
  if (!isRecord(payload) || typeof payload.data !== 'string') {
    throw new Error('AA payload is missing reflection HTML data.');
  }

  const html = payload.data;
  const monthDayMatch = html.match(ARTICLE_DATE_PATTERN);
  const monthDay = monthDayMatch?.[1] ?? null;

  if (!monthDay) {
    throw new Error('AA payload is missing article date metadata.');
  }

  if (monthDay !== expectedMonthDay) {
    throw new Error(`AA payload date mismatch. Expected ${expectedMonthDay}, got ${monthDay}.`);
  }

  const rawTitle = html.match(TITLE_PATTERN)?.[1] ?? '';
  const title = cleanHtmlFragment(rawTitle);
  if (!title) {
    throw new Error('AA payload is missing reflection title.');
  }

  const bodySection =
    html.match(BODY_SECTION_PATTERN)?.[1] ?? html.match(TEASER_SECTION_PATTERN)?.[1] ?? '';
  if (!bodySection) {
    throw new Error('AA payload is missing reflection body section.');
  }

  const paragraphs = extractParagraphs(bodySection);
  if (paragraphs.length === 0) {
    throw new Error('AA payload reflection body could not be parsed.');
  }

  const source = paragraphs.find((paragraph) => SOURCE_PATTERN.test(paragraph)) ?? null;
  const contentParagraphs = source
    ? paragraphs.filter((paragraph) => paragraph !== source)
    : paragraphs;
  const content = contentParagraphs.join('\n\n').trim();

  if (!content) {
    throw new Error('AA payload reflection content is empty.');
  }

  return {
    monthDay,
    title,
    content,
    source,
  };
}
