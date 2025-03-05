import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { debounce } from 'lodash';
import { createHash } from 'crypto';
import * as browserPolyfills from './browser-polyfills';

// Conditionally import Electron-specific modules
let fs: any = null;
let path: any = null;
let app: any = null;
let ipcMain: any = null;
let ipcRenderer: any = null;
let chokidar: any = null;

// Check if we're in a browser or Node.js environment
const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
const isServer = typeof window === 'undefined';
const isBrowser = typeof window !== 'undefined' && !isElectron;

// Only import Node.js modules in Node.js environment
if ((isElectron || isServer) && !isBrowser) {
  // Use dynamic imports to prevent bundling these modules in browser builds
  import('electron').then((electron) => {
    ipcMain = electron.ipcMain;
    ipcRenderer = electron.ipcRenderer;
    app = electron.app;
  }).catch(e => {
    console.warn('Failed to import electron:', e);
  });

  if (isServer) {
    // Server-side imports
    import('fs').then((fsModule) => {
      fs = fsModule;
    }).catch(e => {
      console.warn('Failed to import fs:', e);
    });

    import('path').then((pathModule) => {
      path = pathModule;
    }).catch(e => {
      console.warn('Failed to import path:', e);
    });

    import('chokidar').then((chokidarModule) => {
      chokidar = chokidarModule;
    }).catch(e => {
      console.warn('Failed to import chokidar:', e);
    });
  }
} else if (isBrowser) {
  // In browser, use our polyfills
  console.log('Using browser polyfills for Node.js modules');
  fs = browserPolyfills.fs;
  path = browserPolyfills.path;
}

// Configuration
const supportedExtensions = ['.js', '.ts', '.tsx', '.jsx', '.md', '.txt', '.json', '.py', '.html', '.css', '.scss'];
const ignoredDirectories = ['node_modules', '.git', 'dist', 'build', 'out'];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

// Initialize Pinecone and embeddings lazily to avoid issues in different environments
let pineconeInstance: any = null;
let pineconeIndex: any = null;
let embeddingsInstance: any = null;

function getPinecone() {
  if (!pineconeInstance) {
    pineconeInstance = new Pinecone();
  }
  return pineconeInstance;
}

function getPineconeIndex() {
  if (!pineconeIndex) {
    const pinecone = getPinecone();
    const indexName = process.env.NEXT_PUBLIC_PINECONE_INDEX || process.env.PINECONE_INDEX;
    if (!indexName) {
      console.error('Pinecone index name not provided');
      return null;
    }
    pineconeIndex = pinecone.Index(indexName);
  }
  return pineconeIndex;
}

function getEmbeddings() {
  if (!embeddingsInstance) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not provided');
      return null;
    }
    embeddingsInstance = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-large',
    });
  }
  return embeddingsInstance;
}

// File metadata interface
interface FileMetadata {
  id: string;
  path: string;
  name: string;
  extension: string;
  lastModified: number;
  contentHash: string;
  size: number;
  userId?: string;     // To associate files with specific users
  deviceId?: string;   // To track which device the file came from
}

// File cache to avoid unnecessary processing
interface FileCache {
  [filePath: string]: {
    metadata: FileMetadata;
    contentHash: string;
    embeddingId: string;
  };
}

// For local storage between sessions
const fileCache: FileCache = {};

// Helpers
async function getFileHash(filePath: string, content?: string): Promise<string> {
  try {
    // If content is provided, use it; otherwise, read from the file
    const fileContent = content || (fs ? await fs.readFile(filePath, 'utf8') : '');
    
    // Use crypto in Node.js or Web Crypto API in browser
    if (typeof window === 'undefined' && require('crypto')) {
      return require('crypto').createHash('md5').update(fileContent).digest('hex');
    } else if (typeof window !== 'undefined' && window.crypto) {
      const encoder = new TextEncoder();
      const data = encoder.encode(fileContent);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    throw new Error('No crypto module available');
  } catch (error) {
    console.error('Error generating file hash:', error);
    // Return a timestamp-based hash as fallback
    return `fallback-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
}

async function shouldProcessFile(filePath: string): Promise<boolean> {
  if (!fs || !path) {
    return false;
  }
  
  try {
    const stats = await fs.stat(filePath);
    
    // Skip if too large
    if (stats.size > MAX_FILE_SIZE) return false;
    
    // Check extension
    const ext = path.extname(filePath).toLowerCase();
    if (!supportedExtensions.includes(ext)) return false;
    
    // Check if directory should be ignored
    const relativePath = filePath.split(path.sep);
    if (relativePath.some(part => ignoredDirectories.includes(part))) return false;
    
    return true;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return false;
  }
}

async function embedFileContent(filePath: string, metadata: FileMetadata, content?: string): Promise<string> {
  try {
    // Ensure file content is available
    const fileContent = content || (fs ? await fs.readFile(filePath, 'utf8') : '');
    if (!fileContent) {
      throw new Error('No content provided for embedding');
    }
    
    const embeddings = getEmbeddings();
    if (!embeddings) {
      throw new Error('Embeddings not available');
    }
    
    // Create embedding for file content
    const embedding = await embeddings.embedDocuments([fileContent]);
    
    // Generate a unique ID for this embedding
    const embeddingId = `${metadata.id}-${Date.now()}`;
    
    const index = getPineconeIndex();
    if (!index) {
      throw new Error('Pinecone index not available');
    }
    
    // Upsert the embedding into Pinecone
    await index.upsert([
      {
        id: embeddingId,
        values: embedding[0],
        metadata: {
          path: metadata.path,
          name: metadata.name,
          extension: metadata.extension,
          contentHash: metadata.contentHash,
          lastModified: metadata.lastModified,
          size: metadata.size,
          userId: metadata.userId || '',  // Provide empty string as fallback
          deviceId: metadata.deviceId || '',  // Provide empty string as fallback
        },
      },
    ]);
    
    return embeddingId;
  } catch (error) {
    console.error('Error embedding file content:', error);
    throw error;
  }
}

// Web API for file upload and processing
class WebFileSync {
  private userId: string | null = null;
  private deviceId: string;
  
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }
  
  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return '';
    
    // Try to get the device ID from localStorage
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      // Generate a random device ID
      deviceId = `web-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }
  
  setUserId(userId: string) {
    this.userId = userId;
  }
  
  async uploadFile(file: File): Promise<any> {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      // Read the file
      const content = await this.readFileAsText(file);
      
      // Create a hash of the content
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Create metadata
      const metadata = {
        id: `${file.name}-${Date.now()}`,
        path: file.name,
        name: file.name.split('/').pop() || file.name,
        extension: file.name.split('.').pop() || '',
        lastModified: file.lastModified,
        contentHash,
        size: file.size,
        userId: this.userId || undefined,
        deviceId: this.deviceId,
      };
      
      // Embed the file content
      const embeddingId = await embedFileContent(file.name, metadata, content);
      
      return {
        metadata,
        embeddingId,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
  
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }
  
  async searchFiles(query: string, limit = 10): Promise<any[]> {
    try {
      const embeddings = getEmbeddings();
      if (!embeddings) {
        throw new Error('Embeddings not available');
      }
      
      const queryEmbedding = await embeddings.embedQuery(query);
      
      const index = getPineconeIndex();
      if (!index) {
        throw new Error('Pinecone index not available');
      }
      
      const results = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
      });
      
      return results.matches || [];
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }
}

// Main sync engine class for Electron
export class FileSyncEngine {
  private watcher: any;
  private syncInProgress = false;
  private lastSyncTime = 0;
  private userId: string | null = null;
  private deviceId: string;
  private cache: FileCache = {};
  
  constructor(private rootDirectory: string) {
    // We need to check if we're in Electron
    if (!isElectron && !isServer) {
      throw new Error('FileSyncEngine can only be used in Electron environment');
    }
    
    // Generate device ID
    this.deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  // Set user ID for scoping files
  setUserId(userId: string) {
    this.userId = userId;
  }
  
  // Initialize the sync engine
  async initialize() {
    if (!fs || !path || !app || !chokidar) {
      console.error('Required Electron modules are not available');
      return;
    }
    
    console.log(`Initializing file sync engine for ${this.rootDirectory}`);
    
    // Load cache from storage
    this.loadCache();
    
    // Initial indexing
    await this.performFullSync();
    
    // Set up file watcher
    this.setupWatcher();
    
    // Set up IPC handlers
    this.setupIPC();
  }
  
  private async loadCache() {
    if (!fs || !path || !app) return;
    
    try {
      const cachePath = path.join(app.getPath('userData'), 'fileCache.json');
      const cacheData = await fs.readFile(cachePath, 'utf8');
      Object.assign(this.cache, JSON.parse(cacheData));
    } catch (error) {
      console.log('No existing cache found or error loading cache');
    }
  }
  
  private async saveCache() {
    if (!fs || !path || !app) return;
    
    try {
      const cachePath = path.join(app.getPath('userData'), 'fileCache.json');
      await fs.writeFile(cachePath, JSON.stringify(this.cache), 'utf8');
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }
  
  // Set up file watcher
  private setupWatcher() {
    if (!chokidar) return;
    
    this.watcher = chokidar.watch(this.rootDirectory, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        ...ignoredDirectories.map(dir => `**/${dir}/**`),
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });
    
    // Handle file changes
    const handleChange = debounce(async (filePath: string) => {
      if (await shouldProcessFile(filePath)) {
        await this.processFile(filePath);
      }
    }, 500);
    
    this.watcher
      .on('add', handleChange)
      .on('change', handleChange)
      .on('unlink', (filePath: string) => this.removeFile(filePath));
  }
  
  // Process a single file
  private async processFile(filePath: string): Promise<void> {
    if (!fs || !path) return;
    
    try {
      const stats = await fs.stat(filePath);
      const contentHash = await getFileHash(filePath);
      
      // Check if file has changed
      if (
        this.cache[filePath] && 
        this.cache[filePath].contentHash === contentHash &&
        this.cache[filePath].metadata.lastModified === stats.mtimeMs
      ) {
        // File hasn't changed, skip processing
        return;
      }
      
      const metadata: FileMetadata = {
        id: createHash('md5').update(filePath).digest('hex'),
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath).substring(1),
        lastModified: stats.mtimeMs,
        contentHash,
        size: stats.size,
        userId: this.userId || undefined,
        deviceId: this.deviceId,
      };
      
      const embeddingId = await embedFileContent(filePath, metadata);
      
      // Update cache
      this.cache[filePath] = {
        metadata,
        contentHash,
        embeddingId,
      };
      
      await this.saveCache();
      
      // Notify renderer about updated file
      this.notifyFileProcessed(filePath, metadata);
      
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
  
  // Remove a file from the index
  private async removeFile(filePath: string): Promise<void> {
    try {
      if (!this.cache[filePath]) return;
      
      const { embeddingId } = this.cache[filePath];
      
      // Delete from Pinecone
      const index = getPineconeIndex();
      if (index) {
        await index.deleteOne(embeddingId);
      }
      
      // Remove from cache
      delete this.cache[filePath];
      await this.saveCache();
      
      console.log(`File removed from index: ${filePath}`);
    } catch (error) {
      console.error(`Error removing file ${filePath}:`, error);
    }
  }
  
  // Perform a full sync of all files
  private async performFullSync(): Promise<void> {
    if (!fs || !path || this.syncInProgress) return;
    
    this.syncInProgress = true;
    this.lastSyncTime = Date.now();
    
    try {
      console.log('Starting full file sync...');
      
      const processDirectory = async (dirPath: string) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          // Skip ignored directories
          if (entry.isDirectory()) {
            if (!ignoredDirectories.includes(entry.name)) {
              await processDirectory(fullPath);
            }
            continue;
          }
          
          // Process file if it meets criteria
          if (await shouldProcessFile(fullPath)) {
            await this.processFile(fullPath);
          }
        }
      };
      
      await processDirectory(this.rootDirectory);
      console.log('Full file sync completed');
      
    } catch (error) {
      console.error('Error during full sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
  
  // Set up IPC handlers for renderer communication
  private setupIPC() {
    if (!ipcMain) return;
    
    // Trigger full sync from renderer
    ipcMain.handle('file-sync:full-sync', async () => {
      await this.performFullSync();
      return { success: true, timestamp: this.lastSyncTime };
    });
    
    // Search for files
    ipcMain.handle('file-sync:search-files', async (_event: Electron.IpcMainInvokeEvent, query: string, limit = 10) => {
      try {
        const embeddings = getEmbeddings();
        if (!embeddings) {
          throw new Error('Embeddings not available');
        }
        
        const queryEmbedding = await embeddings.embedQuery(query);
        
        const index = getPineconeIndex();
        if (!index) {
          throw new Error('Pinecone index not available');
        }
        
        const results = await index.query({
          vector: queryEmbedding,
          topK: limit,
          includeMetadata: true,
        });
        
        return results.matches.map((match: any) => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
        }));
      } catch (error) {
        console.error('Error searching files:', error);
        return [];
      }
    });
    
    // Get file content for chat
    ipcMain.handle('file-sync:get-file', async (_event: Electron.IpcMainInvokeEvent, filePath: string) => {
      if (!fs || !path) return null;
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);
        
        return {
          content,
          name: path.basename(filePath),
          path: filePath,
          size: stats.size,
          lastModified: stats.mtimeMs,
        };
      } catch (error) {
        console.error('Error getting file:', error);
        return null;
      }
    });
  }
  
  // Notify renderer about processed file
  private notifyFileProcessed(filePath: string, metadata: FileMetadata) {
    if (global && global.mainWindow) {
      global.mainWindow.webContents.send('file-sync:file-processed', {
        path: filePath,
        metadata,
      });
    }
  }
  
  // Stop the sync engine
  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
    this.saveCache();
  }
}

// Universal client that works in both environments
export class FileSyncClient {
  private static webClient: WebFileSync | null = null;
  private static isElectronEnv = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
  
  // Initialize with user
  static setUserId(userId: string) {
    if (!this.isElectronEnv) {
      if (!this.webClient) {
        this.webClient = new WebFileSync();
      }
      this.webClient.setUserId(userId);
    }
    // For Electron, we'll use main process for this
  }
  
  // Upload file (web only)
  static async uploadFile(file: File): Promise<any> {
    if (this.isElectronEnv) {
      throw new Error('Use local files in Electron environment');
    }
    
    if (!this.webClient) {
      this.webClient = new WebFileSync();
    }
    
    return this.webClient.uploadFile(file);
  }
  
  // Search for files
  static async searchFiles(query: string, limit = 10): Promise<any[]> {
    if (this.isElectronEnv && ipcRenderer) {
      return ipcRenderer.invoke('file-sync:search-files', query, limit);
    } else {
      if (!this.webClient) {
        this.webClient = new WebFileSync();
      }
      return this.webClient.searchFiles(query, limit);
    }
  }
  
  // Get file (Electron only)
  static async getFile(filePath: string): Promise<any> {
    if (this.isElectronEnv && ipcRenderer) {
      return ipcRenderer.invoke('file-sync:get-file', filePath);
    } else {
      throw new Error('Direct file access not available in web environment');
    }
  }
  
  // Trigger full sync (Electron only)
  static async triggerFullSync(): Promise<{ success: boolean; timestamp: number }> {
    if (this.isElectronEnv && ipcRenderer) {
      return ipcRenderer.invoke('file-sync:full-sync');
    } else {
      throw new Error('Full sync not available in web environment');
    }
  }
  
  // Listen for file processed events (Electron only)
  static onFileProcessed(callback: (data: any) => void): () => void {
    if (this.isElectronEnv && ipcRenderer) {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on('file-sync:file-processed', handler);
      return () => ipcRenderer.removeListener('file-sync:file-processed', handler);
    } else {
      // No-op for web
      return () => {};
    }
  }
}