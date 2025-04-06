// Copied and adapted from ai/packages/ui-utils/src/process-data-stream.ts
import { DataStreamPartType, parseDataStreamPart } from './data-stream-parts'; // Use local

const NEWLINE = '\n'.charCodeAt(0);

// concatenates all the chunks into a single Uint8Array
function concatChunks(chunks: Uint8Array[], totalLength: number) {
  const concatenatedChunks = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    concatenatedChunks.set(chunk, offset);
    offset += chunk.length;
  }
  chunks.length = 0;

  return concatenatedChunks;
}

export async function processDataStream({
  stream,
  onTextPart,
  onReasoningPart,
  onReasoningSignaturePart,
  onRedactedReasoningPart,
  onSourcePart,
  onFilePart,
  onDataPart,
  onErrorPart,
  onToolCallStreamingStartPart,
  onToolCallDeltaPart,
  onToolCallPart,
  onToolResultPart,
  onMessageAnnotationsPart,
  onFinishMessagePart,
  onFinishStepPart,
  onStartStepPart,
}: {
  stream: ReadableStream<Uint8Array>;
  onTextPart?: (
    streamPartValue: (DataStreamPartType & { type: 'text' })['value'],
  ) => Promise<void> | void;
  onReasoningPart?: (
    streamPartValue: (DataStreamPartType & { type: 'reasoning' })['value'],
  ) => Promise<void> | void;
  onReasoningSignaturePart?: (
    streamPartValue: (DataStreamPartType & { type: 'reasoning_signature' })['value'],
  ) => Promise<void> | void;
  onRedactedReasoningPart?: (
    streamPartValue: (DataStreamPartType & { type: 'redacted_reasoning' })['value'],
  ) => Promise<void> | void;
  onFilePart?: (
    streamPartValue: (DataStreamPartType & { type: 'file' })['value'],
  ) => Promise<void> | void;
  onSourcePart?: (
    streamPartValue: (DataStreamPartType & { type: 'source' })['value'],
  ) => Promise<void> | void;
  onDataPart?: (
    streamPartValue: (DataStreamPartType & { type: 'data' })['value'],
  ) => Promise<void> | void;
  onErrorPart?: (
    streamPartValue: (DataStreamPartType & { type: 'error' })['value'],
  ) => Promise<void> | void;
  onToolCallStreamingStartPart?: (
    streamPartValue: (DataStreamPartType & {
      type: 'tool_call_streaming_start';
    })['value'],
  ) => Promise<void> | void;
  onToolCallDeltaPart?: (
    streamPartValue: (DataStreamPartType & { type: 'tool_call_delta' })['value'],
  ) => Promise<void> | void;
  onToolCallPart?: (
    streamPartValue: (DataStreamPartType & { type: 'tool_call' })['value'],
  ) => Promise<void> | void;
  onToolResultPart?: (
    streamPartValue: (DataStreamPartType & { type: 'tool_result' })['value'],
  ) => Promise<void> | void;
  onMessageAnnotationsPart?: (
    streamPartValue: (DataStreamPartType & {
      type: 'message_annotations';
    })['value'],
  ) => Promise<void> | void;
  onFinishMessagePart?: (
    streamPartValue: (DataStreamPartType & { type: 'finish_message' })['value'],
  ) => Promise<void> | void;
  onFinishStepPart?: (
    streamPartValue: (DataStreamPartType & { type: 'finish_step' })['value'],
  ) => Promise<void> | void;
  onStartStepPart?: (
    streamPartValue: (DataStreamPartType & { type: 'start_step' })['value'],
  ) => Promise<void> | void;
}): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
       // Process remaining buffer if stream ended mid-line
       if (chunks.length > 0) {
          const concatenatedChunks = concatChunks(chunks, totalLength);
          const lines = decoder
             .decode(concatenatedChunks, { stream: true })
             .split('\n')
             .filter(line => line !== ''); // Filter out empty lines

          for (const line of lines) {
             // Pass the *full line* to parseDataStreamPart
             try {
                const part = parseDataStreamPart(line); // Pass the whole line
                await processPart(part);
             } catch (e) {
                console.error(`Error parsing stream line: "${line}"`, e);
                // Optionally handle/report the error for this specific line
             }
          }
       }
       break; // Exit loop when stream is done
    }

    if (value) {
      chunks.push(value);
      totalLength += value.length;
      // --- Keep improved chunk buffering ---
      let lastNewlineIndex = -1;
      for(let i = value.length - 1; i >= 0; i--) {
          if (value[i] === NEWLINE) {
              lastNewlineIndex = i;
              break;
          }
      }

      // If a newline exists, process the buffer up to the last newline
      if (lastNewlineIndex !== -1) {
          // Combine all chunks and slice up to the last newline
          const concatenatedChunks = concatChunks(chunks, totalLength);
          // Calculate byte index of the character *after* the last newline
          const processableEndIndex = concatenatedChunks.length - (value.length - (lastNewlineIndex + 1));
          const processableBuffer = concatenatedChunks.slice(0, processableEndIndex);
          const remainingBuffer = concatenatedChunks.slice(processableEndIndex);


          // Decode and process the completed lines
          const lines = decoder
              .decode(processableBuffer, { stream: true }) // Process only completed lines
              .split('\n')
              .filter(line => line !== ''); // Filter out empty lines

          for (const line of lines) {
             // Pass the *full line* to parseDataStreamPart
             try {
                const part = parseDataStreamPart(line); // Pass the whole line
                await processPart(part);
             } catch (e) {
                 console.error(`Error parsing stream line: "${line}"`, e);
                 // Optionally handle/report the error for this specific line
             }
          }

          // Put the remaining part back into the chunks buffer
           chunks.length = 0; // Clear chunks array
           if (remainingBuffer.length > 0) {
               chunks.push(remainingBuffer);
               totalLength = remainingBuffer.length;
           } else {
               totalLength = 0;
           }
      }
    }
  }

  async function processPart(part: DataStreamPartType) {
    switch (part.type) {
      case 'text':
        await onTextPart?.(part.value);
        break;
      case 'reasoning':
        await onReasoningPart?.(part.value);
        break;
      case 'reasoning_signature': 
        await onReasoningSignaturePart?.(part.value);
        break;
      case 'redacted_reasoning':
        await onRedactedReasoningPart?.(part.value);
        break;
      case 'file':
        await onFilePart?.(part.value);
        break;
      case 'source':
        await onSourcePart?.(part.value);
        break;
      case 'data':
        await onDataPart?.(part.value);
        break;
      case 'error':
        await onErrorPart?.(part.value);
        break;
      case 'message_annotations':
        await onMessageAnnotationsPart?.(part.value);
        break;
      case 'tool_call_streaming_start':
        await onToolCallStreamingStartPart?.(part.value);
        break;
      case 'tool_call_delta':
        await onToolCallDeltaPart?.(part.value);
        break;
      case 'tool_call':
        await onToolCallPart?.(part.value);
        break;
      case 'tool_result':
        await onToolResultPart?.(part.value);
        break;
      case 'finish_message':
        await onFinishMessagePart?.(part.value);
        break;
      case 'finish_step':
        await onFinishStepPart?.(part.value);
        break;
      case 'start_step':
        await onStartStepPart?.(part.value);
        break;
      default: {
        // This check should be exhaustive based on DataStreamPartType
        const exhaustiveCheck: never = part;
        throw new Error(`Unknown stream part type: ${(exhaustiveCheck as any).type}`);
      }
    }
  }
} 