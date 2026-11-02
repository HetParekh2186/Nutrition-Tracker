// Route rules shared by the middleware and the auth routes. Pure, so tested.

const PUBLIC_PREFIXES = ["/login", "/auth", "/styleguide"];

/** Pages anyone can open. API routes do their own auth and return 401. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/api/")) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Where to send the user after sign-in. Only same-site paths are allowed, so a
 * crafted `?next=https://evil.example` link cannot redirect off the site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.includes("\\")) return "/";
  return next;
}
