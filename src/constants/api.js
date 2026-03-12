const DEFAULT_REMOTE_API_BASE_URL = 'https://donnyswap.xyz/api';
const SAME_ORIGIN_API_PREFIX = '/api';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const resolveBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    const trimmed = import.meta.env.VITE_API_BASE_URL.trim();
    if (trimmed.length > 0) {
      return trimTrailingSlash(trimmed);
    }
  }

  if (typeof window !== 'undefined' && window.location) {
    const { origin, hostname } = window.location;

    if (LOCAL_HOSTNAMES.has(hostname)) {
      return SAME_ORIGIN_API_PREFIX;
    }

    if (origin && origin !== 'null') {
      return `${trimTrailingSlash(origin)}${SAME_ORIGIN_API_PREFIX}`;
    }
  }

  return DEFAULT_REMOTE_API_BASE_URL;
};

export const API_BASE_URL = resolveBaseUrl();

export const apiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${normalizedPath}`;
};

