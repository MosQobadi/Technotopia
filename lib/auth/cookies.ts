const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
}

export interface CookieStore {
  set(name: string, value: string, options?: CookieOptions): void;
}

function getCookieName(): string {
  const name = process.env.COOKIE_NAME;
  if (!name) {
    throw new Error("COOKIE_NAME environment variable is not set");
  }
  return name;
}

function getBaseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookie(cookies: CookieStore, token: string): void {
  cookies.set(getCookieName(), token, {
    ...getBaseCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(cookies: CookieStore): void {
  cookies.set(getCookieName(), "", {
    ...getBaseCookieOptions(),
    maxAge: 0,
  });
}
