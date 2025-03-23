import { AuthenticationError } from '../errors';
import { AuthSession } from '../types';

export function extractAuthToken(request: Request): string {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid Authorization header');
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    throw new AuthenticationError('Missing token in Authorization header');
  }
  
  return token;
}

export function parseJwt<T extends object = any>(token: string): T {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const base64Url = parts[1];
    if (!base64Url) {
      throw new Error('Invalid JWT payload');
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    throw new AuthenticationError('Invalid token format');
  }
}

export function isSessionExpired(session: AuthSession): boolean {
  return Date.now() / 1000 > session.expiresAt - 60;
}