// Copied and adapted from ai/packages/ui-utils/src/process-chat-response.ts
import { generateId as generateIdFunction } from './adapter-utils'; // Use local utils
import {
  calculateLanguageModelUsage,
  LanguageModelUsage,
} from './usage'; // Use local
import { parsePartialJson } from './parse-partial-json'; // Use local
import { processDataStream } from './process-data-stream'; // Use local
import type {
  JSONValue,
  ReasoningUIPart,
  TextUIPart,
  ToolInvocation,
  ToolInvocationUIPart,
  UIMessage,
  UseChatOptions, // Use local definition
  LanguageModelV1FinishReason, // Use local definition
  ToolCall
} from './types'; // Use local

export async function processChatResponse({
  stream,
  update,
  onToolCall,
  onFinish,
  generateId = generateIdFunction,
  getCurrentDate = () => new Date(),
  lastMessage,
}: {
  stream: ReadableStream<Uint8Array>;
  update: (options: {
    message: UIMessage;
    data: JSONValue[] | undefined;
    replaceLastMessage: boolean;
  }) => void;
  onToolCall?: UseChatOptions['onToolCall'];
  onFinish?: (options: {
    message: UIMessage | undefined;
    finishReason: LanguageModelV1FinishReason;
    usage: LanguageModelUsage;
  }) => void;
  generateId?: () => string;
  getCurrentDate?: () => Date;
  lastMessage: UIMessage | undefined;
}) {
  const replaceLastMessage = lastMessage?.role === 'assistant';
  let step = replaceLastMessage
    ? 1 +
      (lastMessage.toolInvocations?.reduce((max, toolInvocation) => {
        return Math.max(max, toolInvocation.step ?? 0);
      }, 0) ?? 0)
    : 0;

  const message: UIMessage = replaceLastMessage
    ? structuredClone(lastMessage)
    : {
        id: generateId(),
        createdAt: getCurrentDate(),
        role: 'assistant',
        content: '',
        parts: [], // Ensure parts is initialized
      };

  // Ensure parts is always an array even when cloning
  if (!Array.isArray(message.parts)) {
     message.parts = [];
  }

  let currentTextPart: TextUIPart | undefined = undefined;
  let currentReasoningPart: ReasoningUIPart | undefined = undefined;
  let currentReasoningTextDetail:
    | { type: 'text'; text: string; signature?: string }
    | undefined = undefined;

  function updateToolInvocationPart(
    toolCallId: string,
    invocation: ToolInvocation,
  ) {
    const partIndex = message.parts.findIndex(
      part =>
        part.type === 'tool-invocation' &&
        part.toolInvocation.toolCallId === toolCallId,
    );

    if (partIndex !== -1) {
      (message.parts[partIndex] as ToolInvocationUIPart).toolInvocation = invocation;
    } else {
      message.parts.push({
        type: 'tool-invocation',
        toolInvocation: invocation,
      });
    }
  }

  const data: JSONValue[] = [];

  let messageAnnotations: JSONValue[] | undefined = replaceLastMessage
    ? lastMessage?.annotations
    : undefined;

  const partialToolCalls: Record<
    string,
    { text: string; step: number; index: number; toolName: string }
  > = {};

  let usage: LanguageModelUsage = {
    completionTokens: NaN,
    promptTokens: NaN,
    totalTokens: NaN,
  };
  let finishReason: LanguageModelV1FinishReason = 'unknown';

  function execUpdate() {
    const copiedData = [...data];

    if (messageAnnotations?.length) {
      message.annotations = messageAnnotations;
    }

    const copiedMessage = {
      ...structuredClone(message),
      revisionId: generateId(), // Add revisionId for SWR compatibility if needed
    } as UIMessage;

    update({
      message: copiedMessage,
      data: copiedData,
      replaceLastMessage,
    });
  }

  await processDataStream({
    stream,
    onTextPart(value) {
      if (currentTextPart == null) {
        currentTextPart = {
          type: 'text',
          text: value,
        };
        message.parts.push(currentTextPart);
      } else {
        currentTextPart.text += value;
      }

      message.content += value;
      execUpdate();
    },
    onReasoningPart(value) {
      if (currentReasoningTextDetail == null) {
        currentReasoningTextDetail = { type: 'text', text: value };
        if (currentReasoningPart != null) {
          currentReasoningPart.details.push(currentReasoningTextDetail);
        }
      } else {
        currentReasoningTextDetail.text += value;
      }

      if (currentReasoningPart == null) {
        currentReasoningPart = {
          type: 'reasoning',
          reasoning: value,
          details: [currentReasoningTextDetail],
        };
        message.parts.push(currentReasoningPart);
      } else {
        currentReasoningPart.reasoning += value;
      }

      message.reasoning = (message.reasoning ?? '') + value;

      execUpdate();
    },
    onReasoningSignaturePart(value) {
      if (currentReasoningTextDetail != null) {
        currentReasoningTextDetail.signature = value.signature;
      }
    },
    onRedactedReasoningPart(value) {
      if (currentReasoningPart == null) {
        currentReasoningPart = {
          type: 'reasoning',
          reasoning: '',
          details: [],
        };
        message.parts.push(currentReasoningPart);
      }

      currentReasoningPart.details.push({
        type: 'redacted',
        data: value.data,
      });

      currentReasoningTextDetail = undefined;

      execUpdate();
    },
    onFilePart(value) {
      message.parts.push({
        type: 'file',
        mimeType: value.mimeType,
        data: value.data,
      });

      execUpdate();
    },
    onSourcePart(value) {
      message.parts.push({
        type: 'source',
        source: value,
      });

      execUpdate();
    },
    onToolCallStreamingStartPart(value) {
      if (message.toolInvocations == null) {
        message.toolInvocations = [];
      }

      partialToolCalls[value.toolCallId] = {
        text: '',
        step,
        toolName: value.toolName,
        index: message.toolInvocations.length,
      };

      const invocation = {
        state: 'partial-call',
        step,
        toolCallId: value.toolCallId,
        toolName: value.toolName,
        args: undefined,
      } as const;

      message.toolInvocations.push(invocation);

      updateToolInvocationPart(value.toolCallId, invocation);

      execUpdate();
    },
    onToolCallDeltaPart(value) {
      const partialToolCall = partialToolCalls[value.toolCallId];

      partialToolCall.text += value.argsTextDelta;

      const { value: partialArgs } = parsePartialJson(partialToolCall.text);

      const invocation = {
        state: 'partial-call',
        step: partialToolCall.step,
        toolCallId: value.toolCallId,
        toolName: partialToolCall.toolName,
        args: partialArgs,
      } as const;

      message.toolInvocations![partialToolCall.index] = invocation;

      updateToolInvocationPart(value.toolCallId, invocation);

      execUpdate();
    },
    async onToolCallPart(value) {
      const invocation = {
        state: 'call',
        step,
        ...value,
      } as const;

      if (partialToolCalls[value.toolCallId] != null) {
        message.toolInvocations![partialToolCalls[value.toolCallId].index] =
          invocation;
      } else {
        if (message.toolInvocations == null) {
          message.toolInvocations = [];
        }

        message.toolInvocations.push(invocation);
      }

      updateToolInvocationPart(value.toolCallId, invocation);

      execUpdate();

      if (onToolCall) {
        const result = await onToolCall({ toolCall: value as ToolCall<string, unknown> }); // Cast if ToolCall type mismatch
        if (result != null) {
          const resultInvocation = {
            state: 'result',
            step,
            ...value,
            result,
          } as const;

          message.toolInvocations![message.toolInvocations!.length - 1] =
            resultInvocation;

          updateToolInvocationPart(value.toolCallId, resultInvocation);

          execUpdate();
        }
      }
    },
    onToolResultPart(value) {
      const toolInvocations = message.toolInvocations;

      if (toolInvocations == null) {
        throw new Error('tool_result must be preceded by a tool_call');
      }

      const toolInvocationIndex = toolInvocations.findIndex(
        invocation => invocation.toolCallId === value.toolCallId,
      );

      if (toolInvocationIndex === -1) {
        throw new Error(
          'tool_result must be preceded by a tool_call with the same toolCallId',
        );
      }

      const resultInvocation = {
        ...toolInvocations[toolInvocationIndex],
        state: 'result' as const,
        ...value,
      } as const;

      toolInvocations[toolInvocationIndex] = resultInvocation;

      updateToolInvocationPart(value.toolCallId, resultInvocation);

      execUpdate();
    },
    onDataPart(value) {
      data.push(...value);
      execUpdate();
    },
    onMessageAnnotationsPart(value) {
      if (messageAnnotations == null) {
        messageAnnotations = [...value];
      } else {
        messageAnnotations.push(...value);
      }

      execUpdate();
    },
    onFinishStepPart(value) {
      step += 1;

      currentTextPart = value.isContinued ? currentTextPart : undefined;
      currentReasoningPart = undefined;
      currentReasoningTextDetail = undefined;
    },
    onStartStepPart(value) {
      if (!replaceLastMessage) {
        message.id = value.messageId;
      }

      message.parts.push({ type: 'step-start' });
      execUpdate();
    },
    onFinishMessagePart(value) {
      finishReason = value.finishReason;
      if (value.usage != null) {
        usage = calculateLanguageModelUsage(value.usage);
      }
    },
    onErrorPart(error) {
      throw new Error(error);
    },
  });

  onFinish?.({ message, finishReason, usage });
} 