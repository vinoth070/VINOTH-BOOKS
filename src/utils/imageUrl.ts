/**
 * Production Asset and Image URL Resolution for VINOTH BOOKS
 * Ensures assets resolve correctly on GitHub Pages (/VINOTH-BOOKS/),
 * preview environments, and local dev server without 404s.
 */

export function resolveBookCover(url?: string): string {
  if (!url) {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    return `${cleanBase}assets/images/book_cover_ai_revolution_1793365303535.jpg`;
  }

  // Absolute URLs (CDN, Cloud Storage, Data URLs)
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;

  // Standardize relative asset paths
  let cleanPath = url
    .replace(/^\/?src\/assets\//, 'assets/')
    .replace(/^\/?assets\//, 'assets/')
    .replace(/^\//, '');

  return `${cleanBase}${cleanPath}`;
}

export function getDefaultAvatar(name?: string): string {
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'V';
  // Elegant gold on obsidian monogram SVG data URI
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#0B1325"/>
    <circle cx="50" cy="50" r="44" stroke="#D4AF37" stroke-width="2" fill="none" opacity="0.6"/>
    <text x="50" y="62" font-family="serif" font-size="44" font-weight="bold" fill="#D4AF37" text-anchor="middle">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function resolveAvatarUrl(photoURL?: string, avatar?: string, name?: string): string {
  const custom = photoURL || avatar;
  if (custom && custom.trim().length > 0) {
    return custom;
  }
  return getDefaultAvatar(name);
}
