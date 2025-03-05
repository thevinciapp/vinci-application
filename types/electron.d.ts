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
  };
}