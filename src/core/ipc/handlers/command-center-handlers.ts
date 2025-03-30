import { ipcMain, IpcMainInvokeEvent, BrowserWindow, app } from 'electron';
import {
  getCommandCenterWindow,
  getContextCommandWindow,
  toggleCommandCenterWindow,
  setDialogState,
  setCommandType
} from '@/core/window/window-service';
import { CommandType } from '@/types/command';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { IpcResponse } from '@/types/ipc';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; 

const SUPPORTED_EXTENSIONS = [
  '.txt', '.md', '.pdf', '.doc', '.docx',
  '.rtf', '.odt', '.html', '.htm', '.xml',
  '.json', '.csv', '.js', '.ts', '.jsx', '.tsx', '.py',
  '.java', '.c', '.cpp', '.h', '.rb', '.go', '.rs',
  '.swift', '.php', '.css', '.scss', '.less',
];

function escapeMdfindQuery(queryPart: string): string {
  return queryPart.replace(/['"]/g, '\\$&');
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

interface DialogData {
  title?: string;
  message?: string;
  type?: string;
  buttons?: string[];
}

interface FileSearchOptions {
  query: string;
  limit?: number;
  type?: 'file' | 'directory' | 'all';
  includeContent?: boolean;
  directory?: string;
}

interface FileReadOptions {
  filePath: string;
  maxSize?: number;
}

interface FileSearchResult {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'directory';
  lastModified: Date;
  size: number;
  content?: string;
}

// Start cache cleanup interval
const startCacheCleanup = () => {
  setInterval(() => {
    const now = Date.now();
    for (const [key, { timestamp }] of Array.from(searchCache.entries())) {
      if (now - timestamp > CACHE_TTL) {
        searchCache.delete(key);
      }
    }
  }, 60000);
};

export function registerCommandCenterHandlers(): void {
  // Start cache cleanup
  startCacheCleanup();

  ipcMain.handle(CommandCenterEvents.TOGGLE, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await toggleCommandCenterWindow(commandType);
      return { success: true, window: window ? true : false };
    } catch (error) {
      console.error('Error toggling command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.SHOW, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await toggleCommandCenterWindow(commandType);
      if (window) {
        window.show();
        window.focus();
      }
      return { success: true };
    } catch (error) {
      console.error('Error showing command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to show command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.CLOSE, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await getContextCommandWindow(commandType);

      if (window?.isVisible()) {
        window.hide();
      }
      return { success: true };
    } catch (error) {
      console.error('Error closing command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to close command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.OPEN_DIALOG, async (_, dialogType: string, data: any) => {
    try {
      setDialogState(true);
      return { success: true };
    } catch (error) {
      console.error('Error opening dialog:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to open dialog' };
    }
  });

  ipcMain.handle(CommandCenterEvents.DIALOG_CLOSED, async () => {
    try {
      setDialogState(false);
      return { success: true };
    } catch (error) {
      console.error('Error closing dialog:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to close dialog' };
    }
  });

  ipcMain.handle(CommandCenterEvents.REFRESH, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await getContextCommandWindow(commandType);

      if (window) {
        window.reload();
      }
      return { success: true };
    } catch (error) {
      console.error('Error refreshing command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to refresh command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.CHECK_TYPE, async (_, commandType: CommandType) => {
    try {
      const window = await getContextCommandWindow(commandType);
      return { success: true, data: { type: commandType, exists: window ? true : false } };
    } catch (error) {
      console.error('Error checking command type:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to check command type' };
    }
  });

  ipcMain.on(CommandCenterEvents.SET_TYPE, (_event: IpcMainInvokeEvent, commandType: CommandType) => {
    setCommandType(commandType);
  });

  ipcMain.on(CommandCenterEvents.SYNC_STATE, (_event: IpcMainInvokeEvent, action: string, data?: any) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(CommandCenterEvents.SYNC_STATE, action, data);
      }
    });
  });

  ipcMain.on(CommandCenterEvents.ON_RESIZE, (_event: IpcMainInvokeEvent, dimensions: { width: number; height: number }, commandType?: CommandType) => {
    if (commandType) {
      const contextWindow = getContextCommandWindow(commandType);
      if (contextWindow && !contextWindow.isDestroyed()) {
        contextWindow.setSize(dimensions.width, dimensions.height);
      }
    } else {
      const commandCenterWindow = getCommandCenterWindow();
      if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
        commandCenterWindow.setSize(dimensions.width, dimensions.height);
      }
    }
  });

  // Spotlight-based file search implementation
  ipcMain.handle(CommandCenterEvents.SEARCH_FILES, async (_event: IpcMainInvokeEvent, options: string | FileSearchOptions): Promise<IpcResponse<FileSearchResult[]>> => {
    try {
      const searchOptions: FileSearchOptions = typeof options === 'string'
        ? { query: options }
        : options;

      const {
        query,
        limit = 100,
        directory,
      } = searchOptions;

      if (!query || query.trim() === '') {
        return { success: true, data: [], status: 'success' };
      }

      const searchTerm = query.toLowerCase().trim();
      
      // Check cache for results
      const cacheKey = searchTerm;
      if (searchCache.has(cacheKey)) {
        const { results, timestamp } = searchCache.get(cacheKey);
        if (Date.now() - timestamp < CACHE_TTL) {
          console.log(`[spotlight] Returning cached results for "${searchTerm}"`);
          return { success: true, data: results, status: 'success' };
        }
      }

      // Default to user's home directory if not specified
      const searchPath = directory || app.getPath('home');
      console.log(`[spotlight] Searching in: ${searchPath}`);

      // Use simpler Spotlight query focused on file names
      const cmd = `mdfind "kMDItemFSName == '*${escapeMdfindQuery(searchTerm)}*'c" -onlyin ${escapeShellArg(searchPath)} | head -n ${limit}`;
      console.log(`[spotlight] Executing search: ${cmd}`);

      const { stdout, stderr } = await exec(cmd);
      if (stderr) {
        console.warn(`[spotlight] Stderr: ${stderr}`);
      }

      if (!stdout.trim()) {
        return { success: true, data: [], status: 'success' };
      }

      const filePaths = stdout.trim().split('\n').filter(Boolean);
      console.log(`[spotlight] Found ${filePaths.length} raw results`);

      const results: FileSearchResult[] = [];
      
      for (const filePath of filePaths) {
        try {
          const stats = await fs.stat(filePath);
          const isDirectory = stats.isDirectory();
          const ext = path.extname(filePath).toLowerCase();
          
          // Filter by supported extensions for files
          if (!isDirectory && !SUPPORTED_EXTENSIONS.includes(ext)) {
            continue;
          }

          results.push({
            id: `file-${Buffer.from(filePath).toString('base64')}`,
            path: filePath,
            name: path.basename(filePath),
            type: isDirectory ? 'directory' : 'file',
            lastModified: stats.mtime,
            size: stats.size,
          });
          
        } catch (statError) {
          // Skip files that can't be accessed
          console.warn(`[spotlight] Could not access file ${filePath}`);
        }
        
        if (results.length >= limit) {
          break;
        }
      }

      // Sort results by relevance (exact name match first)
      results.sort((a, b) => {
        const aNameLower = a.name.toLowerCase();
        const bNameLower = b.name.toLowerCase();
        
        if (aNameLower === searchTerm && bNameLower !== searchTerm) return -1;
        if (bNameLower === searchTerm && aNameLower !== searchTerm) return 1;
        
        return aNameLower.localeCompare(bNameLower);
      });

      // Cache the results
      if (results.length > 0) {
        searchCache.set(cacheKey, {
          results,
          timestamp: Date.now(),
        });
      }

      console.log(`[spotlight] Returning ${results.length} formatted results`);
      return { success: true, data: results, status: 'success' };

    } catch (error: unknown) {
      console.error('[spotlight] Error searching files:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file search';
      return { success: false, error: errorMessage, status: 'error' };
    }
  });

  ipcMain.handle(CommandCenterEvents.READ_FILE, async (_event: IpcMainInvokeEvent, options: string | FileReadOptions): Promise<IpcResponse> => {
    try {
      const readOptions: FileReadOptions = typeof options === 'string'
        ? { filePath: options }
        : options;

      const { filePath, maxSize = 5 * 1024 * 1024 } = readOptions; // Default max 5MB

      if (!filePath) {
        return { success: false, error: 'No file path provided', status: 'error' };
      }

      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        return { success: false, error: 'Not a file', status: 'error' };
      }

      if (stats.size > maxSize) {
        return {
          success: false,
          error: `File too large (${Math.round(stats.size / (1024 * 1024))}MB). Max size is ${Math.round(maxSize / (1024 * 1024))}MB.`,
          status: 'error'
        };
      }

      const ext = path.extname(filePath).toLowerCase();
      const textExtensions = [
        '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.html', '.css',
        '.json', '.csv', '.xml', '.py', '.rb', '.java', '.c', '.cpp',
      ];

      if (!textExtensions.includes(ext)) {
        return {
          success: false,
          error: `Cannot read content of non-text files (${ext})`,
          status: 'error'
        };
      }

      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch (readError) {
        console.error(`Error reading file content for ${filePath}:`, readError);
        return { 
          success: false, 
          error: `Failed to read file: ${readError instanceof Error ? readError.message : 'Unknown read error'}`, 
          status: 'error'
        };
      }

      const MAX_CHAR_LENGTH = 100000;
      let truncated = false;
      
      if (content.length > MAX_CHAR_LENGTH) {
        content = content.substring(0, MAX_CHAR_LENGTH) + '\n\n[Truncated...]';
        truncated = true;
      }

      const metadata = {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        extension: ext.replace('.', '') || 'txt',
        type: 'text',
        truncated
      };

      return {
        success: true,
        data: { content, metadata },
        status: 'success'
      };
    } catch (error: unknown) {
      console.error('Error reading file:', error);
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
         return { success: false, error: 'File not found', status: 'error' };
      }
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while reading the file';
      return { success: false, error: errorMessage, status: 'error' };
    }
  });

  ipcMain.handle(CommandCenterEvents.PING, () => ({ success: true, data: 'pong', status: 'success' }) as IpcResponse<string>);
}