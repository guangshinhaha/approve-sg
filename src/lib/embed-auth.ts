import { verifyEmbedToken, EmbedUser } from "./embed-token";

/**
 * Helper for embed pages to verify the ?token= query parameter.
 * Returns the EmbedUser or null if missing/invalid/expired.
 */
export async function getEmbedUser(
  searchParams: Record<string, string | string[] | undefined>
): Promise<EmbedUser | null> {
  const token =
    typeof searchParams.token === "string" ? searchParams.token : undefined;
  if (!token) return null;
  return verifyEmbedToken(token);
}

/**
 * Parse ?theme=primaryColor,logoUrl from embed query params.
 * Returns CSS variable overrides and logo URL for brand matching.
 */
export function parseTheme(searchParams: Record<string, string | string[] | undefined>): {
  primaryColor: string | null;
  logoUrl: string | null;
  cssVars: Record<string, string>;
} {
  const raw = typeof searchParams.theme === "string" ? searchParams.theme : null;
  if (!raw) return { primaryColor: null, logoUrl: null, cssVars: {} };

  const [primaryColor, logoUrl] = raw.split(",", 2);

  // Validate hex colour (3, 4, 6, or 8 hex digits with optional #)
  const isValidColor = primaryColor && /^#?[0-9a-fA-F]{3,8}$/.test(primaryColor);
  const color = isValidColor
    ? primaryColor.startsWith("#")
      ? primaryColor
      : `#${primaryColor}`
    : null;

  const cssVars: Record<string, string> = {};
  if (color) {
    cssVars["--approve-primary"] = color;
  }

  return {
    primaryColor: color,
    logoUrl: logoUrl?.trim() || null,
    cssVars,
  };
}
