export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isPlatform(platform: 'darwin' | 'win32' | 'linux'): boolean {
  return process.platform === platform;
}

export function isMac(): boolean {
  return isPlatform('darwin');
}

export function isWindows(): boolean {
  return isPlatform('win32');
}

export function isLinux(): boolean {
  return isPlatform('linux');
}