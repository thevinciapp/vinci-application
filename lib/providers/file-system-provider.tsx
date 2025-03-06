import { ContentProvider, MentionContent, MentionItem } from '@/types/mention';
import { FileText, File, Folder, Code } from 'lucide-react';

export const getIconForFileType = (fileType: string): React.ReactNode => {
  switch (fileType?.toLowerCase()) {
    case 'md':
    case 'txt':
    case 'doc':
    case 'docx':
    case 'rtf':
    case 'odt':
      return <FileText className="h-4 w-4" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'go':
    case 'rb':
      return <Code className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

export const FileSystemProvider: ContentProvider = {
  id: 'filesystem',
  name: 'Local Files',
  icon: <FileText className="h-4 w-4" />,
  description: 'Access files from your local file system',
  isEnabled: true,
  requiresAuth: false,
  isAuthenticated: true,
  supportedTypes: ['file', 'folder'],
  
  search: async (query: string, options?: any): Promise<MentionItem[]> => {
    if (!window.electronAPI) {
      console.log("Electron API not available");
      return [];
    }
    
    try {
      const files = await window.electronAPI.searchFiles(query);
      
      return files.map((file: any) => ({
        id: `file-${file.path}`,
        type: 'file',
        name: file.name,
        description: file.path,
        icon: getIconForFileType(file.type),
        path: file.path,
        contentType: file.type
      }));
    } catch (error) {
      console.error("Error searching files:", error);
      return [];
    }
  },
  
  getContent: async (item: MentionItem): Promise<MentionContent> => {
    if (!window.electronAPI) {
      return { 
        content: "Mock file content for " + item.name, 
        type: "text" 
      };
    }
    
    try {
      if (!item.path) throw new Error("No file path provided");
      
      const result = await window.electronAPI.readFile(item.path);
      return {
        content: result.content,
        type: result.type,
        extension: result.extension
      };
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  }
};