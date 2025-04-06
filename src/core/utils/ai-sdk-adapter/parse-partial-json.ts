// Copied and adapted from ai/packages/ui-utils/src/parse-partial-json.ts
import { JSONValue } from './types'; // Use local types
import { safeParseJSON } from './parse-json'; // Use local safeParseJSON
import { fixJson } from './fix-json'; // Use local fixJson

export function parsePartialJson(jsonText: string | undefined): {
  value: JSONValue | undefined;
  state:
    | 'undefined-input'
    | 'successful-parse'
    | 'repaired-parse'
    | 'failed-parse';
} {
  if (jsonText === undefined) {
    return { value: undefined, state: 'undefined-input' };
  }

  let result = safeParseJSON({ text: jsonText });

  if (result.success) {
    return { value: result.value, state: 'successful-parse' };
  }

  result = safeParseJSON({ text: fixJson(jsonText) });

  if (result.success) {
    return { value: result.value, state: 'repaired-parse' };
  }

  return { value: undefined, state: 'failed-parse' };
} 