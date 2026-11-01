/**
 * VINOTH BOOKS — Centralized API Client
 * 
 * Features:
 * - Configurable backend URL via VITE_API_BASE_URL (defaults to relative path for same-origin dev/prod)
 * - Safe content-type verification to prevent "Unexpected token '<'..." errors on GitHub Pages
 * - Automatic Authorization header injection for authenticated requests
 * - Meaningful error messages for network outages, HTML 404 fallbacks, and server failures
 */

export class ApiError extends Error {
  status: number;
  data?: any;
  isHtmlResponse: boolean;
  isNetworkError: boolean;

  constructor(message: string, status = 0, data?: any, isHtmlResponse = false, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isHtmlResponse = isHtmlResponse;
    this.isNetworkError = isNetworkError;
  }
}

// Resolve API base URL: trim trailing slash
export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  // If hosted on GitHub Pages or dev, check for user-saved backend URL (e.g. Render live instance)
  if (typeof window !== 'undefined') {
    try {
      const customUrl = localStorage.getItem('vb_custom_api_url');
      if (customUrl && customUrl.trim()) {
        return customUrl.trim().replace(/\/+$/, '');
      }
    } catch {}
  }
  return '';
};

export const getApiUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const base = getApiBaseUrl();
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanPath}`;
};

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = getApiUrl(endpoint);
  const headers = new Headers(options.headers || {});

  // Add JSON content type for object payloads if not specified
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    try {
      JSON.parse(options.body);
      headers.set('Content-Type', 'application/json');
    } catch {
      // not JSON
    }
  }

  // Inject token if available and not explicitly skipped
  if (!options.skipAuth && !headers.has('Authorization')) {
    const token = localStorage.getItem('vb_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    const message = err?.message || 'Network connection error';
    throw new ApiError(
      `Network error: Unable to reach the server (${url}). Please check your connection or backend configuration.`,
      0,
      null,
      false,
      true
    );
  }

  // Inspect Content-Type before parsing
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const isHtml = contentType.includes('text/html');

  if (isJson) {
    let jsonData: any;
    try {
      jsonData = await response.json();
    } catch (parseErr) {
      throw new ApiError('Failed to parse server JSON response', response.status, null);
    }

    if (!response.ok) {
      const errorMessage = jsonData?.error || jsonData?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, jsonData);
    }

    return jsonData as T;
  }

  // Non-JSON response (e.g. GitHub Pages 404 HTML fallback or plain text)
  const textData = await response.text();

  if (isHtml) {
    // If we received an HTML document when expecting an API response
    const isGithubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
    const tip = isGithubPages
      ? ' This site is hosted on GitHub Pages (static). To use dynamic backend features, deploy the Express server and set VITE_API_BASE_URL.'
      : ' The requested API endpoint returned an HTML page instead of API data.';

    throw new ApiError(
      `API Error (${response.status}): Endpoint '${endpoint}' did not return JSON.${tip}`,
      response.status,
      textData,
      true
    );
  }

  if (!response.ok) {
    throw new ApiError(textData || `Request failed with status ${response.status}`, response.status);
  }

  // Handle plain text response
  try {
    return JSON.parse(textData) as T;
  } catch {
    return textData as unknown as T;
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),

  rawFetch: (endpoint: string, options?: RequestOptions) => {
    const url = getApiUrl(endpoint);
    const headers = new Headers(options?.headers || {});
    if (!options?.skipAuth && !headers.has('Authorization')) {
      const token = localStorage.getItem('vb_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return fetch(url, { ...options, headers });
  },

  isLiveBackendAvailable: async (): Promise<boolean> => {
    try {
      const res = await fetch(getApiUrl('/api/health'), { method: 'GET' });
      return res.ok && (res.headers.get('content-type') || '').includes('application/json');
    } catch {
      return false;
    }
  }
};

export default apiClient;
