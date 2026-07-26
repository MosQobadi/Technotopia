const DIACRITICS_REGEX = /[̀-ͯ]/g;

/** Converts free text into a lowercase kebab-case slug, e.g. "Cameras & Lenses" -> "cameras-lenses". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
