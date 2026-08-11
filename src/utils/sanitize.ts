/**
 * sanitize.ts
 *
 * Strips `<` and `>` from user-supplied strings to prevent stored XSS.
 * This is intentionally minimal — we store plain text, not HTML, so the
 * only risk vector is a string that later gets rendered via innerHTML or
 * dangerouslySetInnerHTML.  Stripping angle brackets closes that gap
 * without pulling in a full sanitization library.
 *
 * ponytail: strips only < and >; sufficient for our plain-text storage.
 * Upgrade path: swap body for DOMPurify.sanitize() if we ever render HTML.
 */
export function sanitize(value: string): string {
  return value.replace(/[<>]/g, '');
}

/** Sanitize every string field in a plain object one level deep. */
export function sanitizeRecord<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out) as (keyof T)[]) {
    if (typeof out[key] === 'string') {
      (out as Record<string, unknown>)[key as string] = sanitize(out[key] as string);
    }
  }
  return out;
}
