import { ExtractedMention, MentionItemType } from '@/types/mention';

// Extracts all content mentions from text (files, conversations, etc.)
export const extractMentions = (text: string): ExtractedMention[] => {
  if (!text) return [];
  
  // Regex to match all mentions in the format @[name](id)
  const regex = /@\[([^\]]+)\]\(([^)]+)\)(\s)?/g;
  let match;
  const mentions: ExtractedMention[] = [];
  
  // Find all mentions
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const id = match[2];
    const fullMatch = match[0];
    
    // Determine the type from the ID prefix
    const type = determineTypeFromId(id);
    
    if (type) {
      mentions.push({ 
        id, 
        name,
        index: match.index,
        length: fullMatch.length,
        text: fullMatch,
        type
      });
    }
  }
  
  // Sort by position in text
  return mentions.sort((a, b) => a.index - b.index);
};

// Helper to determine mention type from ID
export const determineTypeFromId = (id: string): MentionItemType | null => {
  if (id.startsWith('file-')) return 'file';
  if (id.startsWith('folder-')) return 'folder';
  if (id.startsWith('message-')) return 'message';
  if (id.startsWith('conversation-')) return 'conversation';
  return null;
};

// Formats a mention item into text format @[name](id)
export const formatMention = (name: string, id: string): string => {
  return `@[${name}](${id}) `;
};

// Gets display text by removing mention syntax
export const getDisplayText = (text: string): string => {
  if (!text) return '';
  
  let displayText = String(text);
  const mentions = extractMentions(text);
  
  // Replace mentions from right to left to avoid position issues
  for (let i = mentions.length - 1; i >= 0; i--) {
    const mention = mentions[i];
    displayText = displayText.substring(0, mention.index) + 
                  displayText.substring(mention.index + mention.length);
  }
  
  return displayText;
};

// Maps cursor position in display text to position in internal text with mentions
export const mapDisplayToInternalPosition = (displayPosition: number, internalText: string): number => {
  if (!internalText) return displayPosition;
  
  const mentions = extractMentions(internalText);
  if (mentions.length === 0) return displayPosition;
  
  let internalPosition = displayPosition;
  let offset = 0;
  
  // Create a mapping of display positions to internal positions
  for (const mention of mentions) {
    // The display position where this mention would be
    const displayStartPos = mention.index - offset;
    
    // If the cursor is after this mention in the display text,
    // adjust the internal position
    if (displayPosition > displayStartPos) {
      internalPosition += mention.length;
    }
    
    // Update the offset for future mentions
    offset += mention.length;
  }
  
  return internalPosition;
};

// Maps from internal position to display position
export const mapInternalToDisplayPosition = (internalPosition: number, internalText: string): number => {
  if (!internalText) return internalPosition;
  
  const mentions = extractMentions(internalText);
  if (mentions.length === 0) return internalPosition;
  
  let displayPosition = internalPosition;
  
  // For each mention before the internal position, adjust the display position
  for (const mention of mentions) {
    if (mention.index < internalPosition) {
      // If the cursor is within the mention, place it at the start
      if (internalPosition <= mention.index + mention.length) {
        displayPosition = mention.index;
        break;
      }
      // If the cursor is after the mention, subtract its length
      displayPosition -= mention.length;
    }
  }
  
  return displayPosition;
};