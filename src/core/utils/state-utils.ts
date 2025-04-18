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

export function sanitizeStateForIPC(state: Record<string, unknown>): Partial<Record<string, unknown>> {
  const sanitized: Partial<Record<string, unknown>> = {};
  
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'function') continue;
    if (value instanceof Error) {
      sanitized[key] = value.message;
      continue;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'object' && item !== null ? sanitizeStateForIPC(item as Record<string, unknown>) : item
        );
      } else {
        sanitized[key] = sanitizeStateForIPC(value as Record<string, unknown>);
      }
      continue;
    }
    sanitized[key] = value;
  }
  
  return sanitized;
} 