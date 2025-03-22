import { cloneDeep } from 'lodash';

export function makeSerializable<T>(state: T): T {
  try {
    const serialized = JSON.parse(JSON.stringify(cloneDeep(state)));
    return serialized;
  } catch (error) {
    console.error('Failed to serialize state:', error);
    return {} as T;
  }
}

export function sanitizeStateForIPC<T extends Record<string, any>>(state: T): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'function') continue;
    if (value instanceof Error) {
      sanitized[key as keyof T] = value.message as any;
      continue;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        sanitized[key as keyof T] = value.map(item => 
          typeof item === 'object' ? sanitizeStateForIPC(item) : item
        ) as any;
      } else {
        sanitized[key as keyof T] = sanitizeStateForIPC(value) as any;
      }
      continue;
    }
    sanitized[key as keyof T] = value;
  }
  
  return sanitized;
} 