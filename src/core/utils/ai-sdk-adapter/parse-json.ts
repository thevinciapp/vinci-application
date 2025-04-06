// Copied and adapted from ai/packages/provider-utils/src/parse-json.ts
import SecureJSON from 'secure-json-parse';
import { JSONValue, JSONParseError, TypeValidationError } from './types'; // Use local types

// Simplified ParseResult without schema validation
export type SafeParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: JSONParseError | TypeValidationError }; // Keep error types

// Simplified safeParseJSON - removed schema validation and Zod dependency
export function safeParseJSON({
  text,
}: {
  text: string;
}): SafeParseResult<JSONValue> {
  try {
    const value = SecureJSON.parse(text);
    return { success: true, value: value as JSONValue };
  } catch (error) {
    return {
      success: false,
      error: JSONParseError.isInstance(error)
        ? error
        : new JSONParseError({ text, cause: error }),
    };
  }
} 