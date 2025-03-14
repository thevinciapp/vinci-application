/**
 * API configuration constants
 */

export const API_CONFIG = {
  APP_BASE_URL: 'http://localhost:3000',
  API_BASE_URL: 'http://localhost:3001',
} as const;

// Export individual constants for convenience
export const { APP_BASE_URL, API_BASE_URL } = API_CONFIG;
