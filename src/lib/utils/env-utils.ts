/**
 * Environment utilities
 */

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running on a specific platform
 */
export function isPlatform(platform: 'darwin' | 'win32' | 'linux'): boolean {
  return process.platform === platform;
}

/**
 * Check if running on macOS
 */
export function isMac(): boolean {
  return isPlatform('darwin');
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return isPlatform('win32');
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return isPlatform('linux');
}