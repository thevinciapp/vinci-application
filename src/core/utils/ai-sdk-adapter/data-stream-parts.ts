// Copied and adapted from ai/packages/ui-utils/src/data-stream-parts.ts

// Use locally defined types instead of importing from @ai-sdk/provider*
import { JSONValue, ToolInvocation } from './types'; // Assuming ToolCall/ToolResult are in local types.ts

type LanguageModelV1FinishReason = string; // Define simply for adapter
type LanguageModelV1Source = any; // Define simply for adapter
type ToolCall = ToolInvocation; // Alias for clarity within this file
type ToolResult = ToolInvocation; // Alias for clarity

// --- Original Data Stream Parts Logic --- 

export const DataStreamStringPrefixes = {
  text: '0',
  function_call: '1', // Although function_call is deprecated, keep prefix for safety
  data: '2',
  error: '3',
  assistant_message: '4',
  assistant_control_data: '5',
  data_stream_error: '6',
  control_data: '7',
  message_annotations: '8',
  tool_call: '9',
  tool_result: 'a',
  tool_call_streaming_start: 'b',
  tool_call_delta: 'c',
  finish_message: 'd',
  finish_step: 'e',
  start_step: 'f',
  reasoning: 'g',
  source: 'h',
  redacted_reasoning: 'i',
  reasoning_signature: 'j',
  file: 'k',
} as const;

export type DataStreamString =
  `${(typeof DataStreamStringPrefixes)[keyof typeof DataStreamStringPrefixes]}:${string}\n`;

export interface DataStreamPart<
  CODE extends string,
  NAME extends string,
  TYPE,
> {
  code: CODE;
  name: NAME;
  parse: (value: JSONValue) => { type: NAME; value: TYPE };
}

const textStreamPart: DataStreamPart<'0', 'text', string> = {
  code: DataStreamStringPrefixes.text,
  name: 'text',
  parse: (value: JSONValue) => {
    if (typeof value !== 'string') {
      throw new Error('"text" parts expect a string value.');
    }
    return { type: 'text', value };
  },
};

const dataStreamPart: DataStreamPart<'2', 'data', Array<JSONValue>> = {
  code: DataStreamStringPrefixes.data,
  name: 'data',
  parse: (value: JSONValue) => {
    if (!Array.isArray(value)) {
      throw new Error('"data" parts expect an array value.');
    }

    return { type: 'data', value };
  },
};

const errorStreamPart: DataStreamPart<'3', 'error', string> = {
  code: DataStreamStringPrefixes.error,
  name: 'error',
  parse: (value: JSONValue) => {
    if (typeof value !== 'string') {
      throw new Error('"error" parts expect a string value.');
    }
    return { type: 'error', value };
  },
};

const messageAnnotationsStreamPart: DataStreamPart<
  '8',
  'message_annotations',
  Array<JSONValue>
> = {
  code: DataStreamStringPrefixes.message_annotations,
  name: 'message_annotations',
  parse: (value: JSONValue) => {
    if (!Array.isArray(value)) {
      throw new Error('"message_annotations" parts expect an array value.');
    }

    return { type: 'message_annotations', value };
  },
};

const toolCallStreamPart: DataStreamPart<
  '9',
  'tool_call',
  ToolCall<string, any>
> = {
  code: DataStreamStringPrefixes.tool_call,
  name: 'tool_call',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('toolCallId' in value) ||
      typeof value.toolCallId !== 'string' ||
      !('toolName' in value) ||
      typeof value.toolName !== 'string' ||
      !('args' in value) ||
      typeof value.args !== 'object'
    ) {
      throw new Error(
        '"tool_call" parts expect an object with a "toolCallId", "toolName", and "args" property.',
      );
    }

    return {
      type: 'tool_call',
      value: value as unknown as ToolCall<string, any>,
    };
  },
};

const toolResultStreamPart: DataStreamPart<
  'a',
  'tool_result',
  Omit<ToolResult<string, any, any>, 'args' | 'toolName'>
> = {
  code: DataStreamStringPrefixes.tool_result,
  name: 'tool_result',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('toolCallId' in value) ||
      typeof value.toolCallId !== 'string' ||
      !('result' in value)
    ) {
      throw new Error(
        '"tool_result" parts expect an object with a "toolCallId" and a "result" property.',
      );
    }

    return {
      type: 'tool_result',
      value: value as unknown as Omit<
        ToolResult<string, any, any>,
        'args' | 'toolName'
      >,
    };
  },
};

const toolCallStreamingStartStreamPart: DataStreamPart<
  'b',
  'tool_call_streaming_start',
  { toolCallId: string; toolName: string }
> = {
  code: DataStreamStringPrefixes.tool_call_streaming_start,
  name: 'tool_call_streaming_start',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('toolCallId' in value) ||
      typeof value.toolCallId !== 'string' ||
      !('toolName' in value) ||
      typeof value.toolName !== 'string'
    ) {
      throw new Error(
        '"tool_call_streaming_start" parts expect an object with a "toolCallId" and "toolName" property.',
      );
    }

    return {
      type: 'tool_call_streaming_start',
      value: value as unknown as { toolCallId: string; toolName: string },
    };
  },
};

const toolCallDeltaStreamPart: DataStreamPart<
  'c',
  'tool_call_delta',
  { toolCallId: string; argsTextDelta: string }
> = {
  code: DataStreamStringPrefixes.tool_call_delta,
  name: 'tool_call_delta',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('toolCallId' in value) ||
      typeof value.toolCallId !== 'string' ||
      !('argsTextDelta' in value) ||
      typeof value.argsTextDelta !== 'string'
    ) {
      throw new Error(
        '"tool_call_delta" parts expect an object with a "toolCallId" and "argsTextDelta" property.',
      );
    }

    return {
      type: 'tool_call_delta',
      value: value as unknown as {
        toolCallId: string;
        argsTextDelta: string;
      },
    };
  },
};

const finishMessageStreamPart: DataStreamPart<
  'd',
  'finish_message',
  {
    finishReason: LanguageModelV1FinishReason;
    usage?: {
      promptTokens: number;
      completionTokens: number;
    };
  }
> = {
  code: DataStreamStringPrefixes.finish_message,
  name: 'finish_message',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('finishReason' in value) ||
      typeof value.finishReason !== 'string'
    ) {
      throw new Error(
        '"finish_message" parts expect an object with a "finishReason" property.',
      );
    }

    const result: {
      finishReason: LanguageModelV1FinishReason;
      usage?: {
        promptTokens: number;
        completionTokens: number;
      };
    } = {
      finishReason: value.finishReason as LanguageModelV1FinishReason,
    };

    if (
      'usage' in value &&
      value.usage != null &&
      typeof value.usage === 'object' &&
      'promptTokens' in value.usage &&
      'completionTokens' in value.usage
    ) {
      result.usage = {
        promptTokens:
          typeof value.usage.promptTokens === 'number'
            ? value.usage.promptTokens
            : Number.NaN,
        completionTokens:
          typeof value.usage.completionTokens === 'number'
            ? value.usage.completionTokens
            : Number.NaN,
      };
    }

    return {
      type: 'finish_message',
      value: result,
    };
  },
};

const finishStepStreamPart: DataStreamPart<
  'e',
  'finish_step',
  {
    isContinued: boolean;
    finishReason: LanguageModelV1FinishReason;
    usage?: {
      promptTokens: number;
      completionTokens: number;
    };
  }
> = {
  code: DataStreamStringPrefixes.finish_step,
  name: 'finish_step',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('finishReason' in value) ||
      typeof value.finishReason !== 'string'
    ) {
      throw new Error(
        '"finish_step" parts expect an object with a "finishReason" property.',
      );
    }

    const result: {
      isContinued: boolean;
      finishReason: LanguageModelV1FinishReason;
      usage?: {
        promptTokens: number;
        completionTokens: number;
      };
    } = {
      finishReason: value.finishReason as LanguageModelV1FinishReason,
      isContinued: false,
    };

    if (
      'usage' in value &&
      value.usage != null &&
      typeof value.usage === 'object' &&
      'promptTokens' in value.usage &&
      'completionTokens' in value.usage
    ) {
      result.usage = {
        promptTokens:
          typeof value.usage.promptTokens === 'number'
            ? value.usage.promptTokens
            : Number.NaN,
        completionTokens:
          typeof value.usage.completionTokens === 'number'
            ? value.usage.completionTokens
            : Number.NaN,
      };
    }

    if ('isContinued' in value && typeof value.isContinued === 'boolean') {
      result.isContinued = value.isContinued;
    }

    return {
      type: 'finish_step',
      value: result,
    };
  },
};

const startStepStreamPart: DataStreamPart<
  'f',
  'start_step',
  {
    messageId: string;
  }
> = {
  code: DataStreamStringPrefixes.start_step,
  name: 'start_step',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('messageId' in value) ||
      typeof value.messageId !== 'string'
    ) {
      throw new Error(
        '"start_step" parts expect an object with an "messageId" property.',
      );
    }

    return {
      type: 'start_step',
      value: {
        messageId: value.messageId,
      },
    };
  },
};

const reasoningStreamPart: DataStreamPart<'g', 'reasoning', string> = {
  code: DataStreamStringPrefixes.reasoning,
  name: 'reasoning',
  parse: (value: JSONValue) => {
    if (typeof value !== 'string') {
      throw new Error('"reasoning" parts expect a string value.');
    }
    return { type: 'reasoning', value };
  },
};

const sourcePart: DataStreamPart<'h', 'source', LanguageModelV1Source> = {
  code: DataStreamStringPrefixes.source,
  name: 'source',
  parse: (value: JSONValue) => {
    if (value == null || typeof value !== 'object') {
      throw new Error('"source" parts expect a Source object.');
    }

    return {
      type: 'source',
      value: value as LanguageModelV1Source,
    };
  },
};

const redactedReasoningStreamPart: DataStreamPart<
  'i',
  'redacted_reasoning',
  { data: string }
> = {
  code: DataStreamStringPrefixes.redacted_reasoning,
  name: 'redacted_reasoning',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('data' in value) ||
      typeof value.data !== 'string'
    ) {
      throw new Error(
        '"redacted_reasoning" parts expect an object with a "data" property.',
      );
    }
    return { type: 'redacted_reasoning', value: { data: value.data } };
  },
};

const reasoningSignatureStreamPart: DataStreamPart<
  'j',
  'reasoning_signature',
  { signature: string }
> = {
  code: DataStreamStringPrefixes.reasoning_signature,
  name: 'reasoning_signature',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('signature' in value) ||
      typeof value.signature !== 'string'
    ) {
      throw new Error(
        '"reasoning_signature" parts expect an object with a "signature" property.',
      );
    }
    return { type: 'reasoning_signature', value: { signature: value.signature } };
  },
};

const fileStreamPart: DataStreamPart<'k', 'file', { mimeType: string; data: string }> = {
  code: DataStreamStringPrefixes.file,
  name: 'file',
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('mimeType' in value) ||
      typeof value.mimeType !== 'string' ||
      !('data' in value) ||
      typeof value.data !== 'string'
    ) {
      throw new Error(
        '"file" parts expect an object with "mimeType" and "data" properties.',
      );
    }
    return {
      type: 'file',
      value: {
        mimeType: value.mimeType,
        data: value.data,
      },
    };
  },
};


const dataStreamParts = [
  textStreamPart,
  dataStreamPart,
  errorStreamPart,
  messageAnnotationsStreamPart,
  toolCallStreamPart,
  toolResultStreamPart,
  toolCallStreamingStartStreamPart,
  toolCallDeltaStreamPart,
  finishMessageStreamPart,
  finishStepStreamPart,
  startStepStreamPart,
  reasoningStreamPart,
  sourcePart,
  redactedReasoningStreamPart,
  reasoningSignatureStreamPart,
  fileStreamPart,
] as const;

type DataStreamParts = (typeof dataStreamParts)[number];

const dataStreamPartsByCode: Record<string, DataStreamParts> = {};
for (const part of dataStreamParts) {
  dataStreamPartsByCode[part.code] = part;
}

type DataStreamPartValueType = {
  [P in DataStreamParts as P['name']]: ReturnType<P['parse']>['value'];
};

export type DataStreamPartType = ReturnType<DataStreamParts['parse']>;

/**
 * Parses a data stream string (e.g. `0:"Hello"\n`).
 */
export const parseDataStreamPart = (line: string): DataStreamPartType => {
  const firstColonIndex = line.indexOf(':');

  if (firstColonIndex === -1) {
    throw new Error(`Invalid data stream part format: ${line}`);
  }

  const code = line.substring(0, firstColonIndex);
  const textValue = line.substring(firstColonIndex + 1);

  const part = dataStreamPartsByCode[code];

  if (part == null) {
    throw new Error(`Unknown data stream part code: ${code}`);
  }

  try {
    const value = JSON.parse(textValue);
    return part.parse(value);
  } catch (error) {
    throw new Error(
      `Could not parse data stream part value ${JSON.stringify(
        textValue,
      )} for code ${code}: ${error}`,
    );
  }
};

export function formatDataStreamPart<T extends keyof DataStreamPartValueType>(
  type: T,
  value: DataStreamPartValueType[T],
): DataStreamString {
  const part = dataStreamParts.find(p => p.name === type);

  if (part == null) {
    throw new Error(`Unknown stream part type: ${type}`);
  }

  return `${part.code}:${JSON.stringify(value)}\n`;
} 