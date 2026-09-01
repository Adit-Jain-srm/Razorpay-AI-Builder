/**
 * Slug helpers for landing pages. PURE + client-safe so the editor can preview a
 * slug and the service can guarantee uniqueness with one implementation.
 */

const MAX_SLUG_LENGTH = 60;

/** URL-safe, lowercase, hyphen-separated slug derived from arbitrary text. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return base || "page";
}

/**
 * Resolves a collision-free slug. Calls `exists(candidate)` (sync or async) and
 * appends `-2`, `-3`, ... until it finds a free one. Keeps a bounded loop so a
 * misbehaving `exists` can never spin forever - after which it falls back to a
 * random suffix that is effectively unique.
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => boolean | Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;

  for (let n = 2; n < maxAttempts; n += 1) {
    const candidate = `${root}-${n}`.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
    if (!(await exists(candidate))) return candidate;
  }

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${root}-${suffix}`.slice(0, MAX_SLUG_LENGTH);
}
