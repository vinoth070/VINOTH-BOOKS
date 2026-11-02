/**
 * Production Asset and Image URL Resolution for VINOTH BOOKS
 * Resolves correctly on:
 * - Vercel root deployments (e.g. https://vinoth-books.vercel.app/)
 * - GitHub Pages subpath (e.g. https://vinoth070.github.io/VINOTH-BOOKS/)
 * - Localhost and preview environments
 */

// Permanent, high-fidelity CDN fallbacks for core publications
export const FALLBACK_BOOK_COVERS = {
  ai: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  focus: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  wealth: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
};

export function getRuntimeBase(): string {
  if (typeof window !== 'undefined') {
    // If the browser URL path starts with /VINOTH-BOOKS (GitHub Pages deployment)
    if (window.location.pathname.startsWith('/VINOTH-BOOKS')) {
      return '/VINOTH-BOOKS/';
    }
    // Vercel, Netlify, custom domain or local root
    return '/';
  }
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function resolveBookCover(url?: string): string {
  if (!url || !url.trim()) {
    const base = getRuntimeBase();
    return `${base}assets/images/book_cover_ai_revolution_1793365303535.jpg`;
  }

  const trimmed = url.trim();

  // Absolute URLs (CDN, Cloud Storage, Data URLs, Blob URLs)
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const base = getRuntimeBase();

  // Standardize relative asset paths from local or bundled directories
  const cleanPath = trimmed
    .replace(/^\/?VINOTH-BOOKS\//, '')
    .replace(/^\/?src\/assets\//, 'assets/')
    .replace(/^\/?assets\//, 'assets/')
    .replace(/^\//, '');

  return `${base}${cleanPath}`;
}

export function handleBookCoverError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (target.dataset.triedFallback === 'true') {
    return;
  }
  target.dataset.triedFallback = 'true';
  const src = (target.src || '').toLowerCase();
  if (src.includes('revolution') || src.includes('ai')) {
    target.src = FALLBACK_BOOK_COVERS.ai;
  } else if (src.includes('focus')) {
    target.src = FALLBACK_BOOK_COVERS.focus;
  } else if (src.includes('wealth')) {
    target.src = FALLBACK_BOOK_COVERS.wealth;
  } else {
    target.src = FALLBACK_BOOK_COVERS.default;
  }
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
