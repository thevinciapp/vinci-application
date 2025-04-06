// Copied and adapted from ai/packages/ui-utils/src/types.ts
// Removed imports from @ai-sdk/provider and provider-utils, will define needed types locally

// Define necessary types locally if not importing
type LanguageModelV1FinishReason =
  | 'stop'
  | 'length'
  | 'content-filter'
  | 'tool-calls'
  | 'error'
  | 'other'
  | 'unknown';

interface LanguageModelV1Source {
    contentType: string;
    data: Uint8Array;
}

interface ToolCall<NAME extends string, ARGS> {
  toolCallId: string;
  toolName: NAME;
  args: ARGS;
}

interface ToolResult<NAME extends string, ARGS, RESULT> {
  toolCallId: string;
  toolName: NAME;
  args: ARGS;
  result: RESULT;
}

// Basic JSONValue definition
export type JSONValue =
  | null
  | string
  | number
  | boolean
  | { [value: string]: JSONValue }
  | Array<JSONValue>;

// Original content from types.ts starts here, adapted imports might be needed later

// export * from './use-assistant-types'; // Assuming not needed for chat handler

export type IdGenerator = () => string;

export type ToolInvocation =
  | ({ state: 'partial-call'; step?: number } & ToolCall<string, any>)
  | ({ state: 'call'; step?: number } & ToolCall<string, any>)
  | ({ state: 'result'; step?: number } & ToolResult<string, any, any>);

export interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
}

export interface Message {
  id: string;
  createdAt?: Date;
  content: string;
  reasoning?: string;
  experimental_attachments?: Attachment[];
  role: 'system' | 'user' | 'assistant' | 'data';
  data?: JSONValue;
  annotations?: JSONValue[] | undefined;
  toolInvocations?: Array<ToolInvocation>;
  parts?: Array<
    | TextUIPart
    | ReasoningUIPart
    | ToolInvocationUIPart
    | SourceUIPart
    | FileUIPart
    | StepStartUIPart
  >;
}

export type UIMessage = Message & {
  parts: Array<
    | TextUIPart
    | ReasoningUIPart
    | ToolInvocationUIPart
    | SourceUIPart
    | FileUIPart
    | StepStartUIPart
  >;
};

export type TextUIPart = {
  type: 'text';
  text: string;
};

export type ReasoningUIPart = {
  type: 'reasoning';
  reasoning: string;
  details: Array<
    | { type: 'text'; text: string; signature?: string }
    | { type: 'redacted'; data: string }
  >;
};

export type ToolInvocationUIPart = {
  type: 'tool-invocation';
  toolInvocation: ToolInvocation;
};

export type SourceUIPart = {
  type: 'source';
  source: LanguageModelV1Source;
};

export type FileUIPart = {
  type: 'file';
  mimeType: string;
  data: string; // base64 encoded data
};

export type StepStartUIPart = {
  type: 'step-start';
};

export type CreateMessage = Omit<Message, 'id'> & {
  id?: Message['id'];
};

// -- Types below might not be directly needed by the adapter utils --
// -- but included for completeness if process-chat-response depends on them --

export type ChatRequest = {
  headers?: Record<string, string> | Headers;
  body?: object;
  messages: Message[];
  data?: JSONValue;
};

export type RequestOptions = {
  headers?: Record<string, string> | Headers;
  body?: object;
};

export type ChatRequestOptions = {
  headers?: Record<string, string> | Headers;
  body?: object;
  data?: JSONValue;
  experimental_attachments?: FileList | Array<Attachment>;
  allowEmptySubmit?: boolean;
};

// Define LanguageModelUsage locally
export type LanguageModelUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};


export type UseChatOptions = {
  keepLastMessageOnError?: boolean;
  api?: string;
  id?: string;
  initialMessages?: Message[];
  initialInput?: string;
  onToolCall?: ({
    toolCall,
  }: {
    toolCall: ToolCall<string, unknown>;
  }) => void | Promise<unknown> | unknown;
  onResponse?: (response: Response) => void | Promise<void>;
  onFinish?: (
    message: Message,
    options: {
      usage: LanguageModelUsage;
      finishReason: LanguageModelV1FinishReason;
    },
  ) => void;
  onError?: (error: Error) => void;
  generateId?: IdGenerator;
  credentials?: RequestCredentials;
  headers?: Record<string, string> | Headers;
  body?: object;
  sendExtraMessageFields?: boolean;
  streamProtocol?: 'data' | 'text';
  // fetch?: FetchFunction; // Removing FetchFunction dependency
}; 

// Define error types locally
export class JSONParseError extends Error {
  static isInstance(error: any): error is JSONParseError {
    return error instanceof JSONParseError;
  }
  constructor({ text, cause }: { text: string; cause: unknown }) {
    super(`Failed to parse JSON. Text: ${text}. Cause: ${cause instanceof Error ? cause.message : cause}`);
    this.name = 'JSONParseError';
  }
}

export class TypeValidationError extends Error {
  static isInstance(error: any): error is TypeValidationError {
    return error instanceof TypeValidationError;
  }
  static wrap({ value, cause }: { value: unknown; cause: unknown }): TypeValidationError {
     return new TypeValidationError({ message: `Type validation failed. Cause: ${cause instanceof Error ? cause.message : cause}`, value, cause });
  }
  readonly value: unknown;
  constructor({ message, value, cause }: { message: string; value: unknown; cause: unknown }) {
    super(message);
    this.name = 'TypeValidationError';
    this.cause = cause;
    this.value = value;
  }
} 