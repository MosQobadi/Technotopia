/**
 * A `?next=` value that is safe to send someone to after they sign in, or null.
 *
 * Only a path on this site. "//evil.example" and "/\evil.example" both read as
 * another host to a browser, and anything with a scheme leaves outright — a
 * login page that followed those would be an open redirect with our name on it.
 * The path is locale-less; the i18n router puts the reader's locale back on.
 */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return null;
  }
  return raw;
}
