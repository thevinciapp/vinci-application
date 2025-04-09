import { useCallback } from 'react';
import { useToast } from 'shared/hooks/use-toast';
import { Logger } from 'shared/lib/logger';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { FileReference } from '../types/file-reference';

const logger = new Logger('useFileSelection');

type FileTag = {
  id: string;
  name: string;
  path: string;
};

interface UseFileSelectionProps {
  setFileReferences: React.Dispatch<React.SetStateAction<FileReference[]>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  currentInput: string;
}

export const useFileSelection = ({ setFileReferences, setInput, currentInput }: UseFileSelectionProps) => {
  const { toast } = useToast();

  const selectFile = useCallback(async (file: FileTag) => {
    logger.debug('Selecting file:', { file });
    let fileContent = '';

    try {
      const response = await window.electron.invoke(CommandCenterEvents.READ_FILE, {
        filePath: file.path,
        maxSize: 1024 * 1024, // 1MB limit
      });

      if (response.success && response.data) {
        fileContent = response.data.content;
        logger.debug('Successfully read file content', { path: file.path });
      } else {
        const errorMsg = response.error || 'Unknown error reading file';
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      fileContent = `[Error loading file content: ${errorMsg}]`;
      logger.error(`Error reading file`, { path: file.path, error: errorMsg });
      toast({
        title: "Error Reading File",
        description: `Could not read file content for "${file.name}": ${errorMsg}`,
        variant: "destructive",
      });
    }

    const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    setFileReferences(prev => {
      const newRef: FileReference = {
        id: fileId,
        path: file.path,
        name: file.name,
        content: fileContent,
        type: 'file' as const
      };
      if (!prev.some(ref => ref.path === file.path)) {
        logger.debug('Adding new file reference:', { newRef });
        return [...prev, newRef];
      }
      logger.debug('File reference already exists:', { path: file.path });
      return prev;
    });

    // Clear the input up to the last '@' symbol used for triggering file selection
    if (currentInput.includes('@')) {
      const atIndex = currentInput.lastIndexOf('@');
      setInput(currentInput.substring(0, atIndex));
      logger.debug('Cleared input after file selection', { oldInput: currentInput, newIndex: atIndex });
    }

  }, [setFileReferences, setInput, currentInput, toast]);

  return { selectFile };
}; 