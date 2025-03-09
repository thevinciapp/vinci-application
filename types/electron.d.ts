/**
 * Type definitions for Electron API
 */

interface Window {
  electronAPI?: {
    searchFiles: (searchTerm: string) => Promise<Array<{
      path: string;
      name: string;
      type: string;
      size?: number;
      modified?: string;
    }>>;
    
    readFile: (filePath: string) => Promise<{
      content: string;
      type: 'text' | 'binary';
      extension?: string;
    }>;
    
    ping: () => string;
    
    // Command center functions
    toggleCommandCenter: () => void;
    openCommandType: (commandType: string) => void;
    onToggleCommandCenter: (callback: () => void) => (() => void);
    onSetCommandType: (callback: (event: any, commandType: string) => void) => (() => void);
  };
}