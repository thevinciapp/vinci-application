import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import * as fs from "fs";
import * as path from "path";

let mainWindow: BrowserWindow;

const createWindow = () => {
  console.log("Creating Electron window");
  
  // Resolve the preload script path
  const preloadPath = join(__dirname, "preload.js");
  console.log("Preload script path:", preloadPath);
  console.log("Preload script exists:", fs.existsSync(preloadPath));
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  mainWindow.loadURL("http://localhost:3000");
  
  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // Log when web contents are created
  mainWindow.webContents.on('did-finish-load', () => {
    console.log("Webpage finished loading");
  });
};

// Cache for file search results
let fileCache: {[dir: string]: any[]} = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute cache TTL

// Non-blocking file search implementation
const searchFiles = async (searchTerm: string, maxResults = 50) => {
  // Define supported file extensions for text-based files
  const supportedExtensions = [
    ".txt", ".md", ".pdf", ".doc", ".docx", 
    ".rtf", ".odt", ".html", ".htm", ".xml",
    ".json", ".csv", ".js", ".ts", ".py", 
    ".java", ".c", ".cpp", ".h", ".rb", ".go"
  ];

  // Get the user's home directory
  const homeDir = app.getPath("home");
  
  // Common directories to search
  const commonDirs = [
    path.join(homeDir, "Documents"),
    path.join(homeDir, "Desktop"),
    path.join(homeDir, "Downloads")
  ];

  // Refresh cache if needed
  const now = Date.now();
  if (now - lastCacheUpdate > CACHE_TTL) {
    fileCache = {};
    lastCacheUpdate = now;
  }
  
  let allResults: any[] = [];
  const searchPromises = commonDirs.map(async (dir) => {
    try {
      // Use cached results if available
      if (fileCache[dir]) {
        return fileCache[dir].filter((file: any) => 
          file.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Prepare to collect files
      const dirResults: any[] = [];
      
      // Use a queue-based approach instead of recursion for better performance
      const queue: string[] = [dir];
      let searchDepth = 0;
      const MAX_DEPTH = 3; // Limit search depth
      
      while (queue.length > 0 && dirResults.length < maxResults && searchDepth < MAX_DEPTH) {
        const currentDir = queue.shift();
        if (!currentDir) continue;
        
        // If we're going deeper, increase depth
        if (currentDir !== dir) {
          const relativePath = path.relative(dir, currentDir);
          const depth = relativePath.split(path.sep).length;
          if (depth > searchDepth) {
            searchDepth = depth;
          }
        }
        
        try {
          const files = fs.readdirSync(currentDir);
          
          for (const file of files) {
            if (dirResults.length >= maxResults) break;
            
            try {
              const filePath = path.join(currentDir, file);
              const stat = fs.statSync(filePath);
              
              // Skip hidden files and directories
              if (file.startsWith(".")) continue;
              
              if (stat.isDirectory()) {
                // Add directory to queue for BFS
                queue.push(filePath);
              } else {
                // Check if file has supported extension
                const ext = path.extname(file).toLowerCase();
                if (supportedExtensions.includes(ext)) {
                  // Add file to results regardless of name for caching
                  const fileInfo = {
                    path: filePath,
                    name: file,
                    type: ext.slice(1) // Remove the dot from extension
                  };
                  dirResults.push(fileInfo);
                }
              }
            } catch (err) {
              // Ignore errors (permission issues, etc.)
              continue;
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      // Update cache
      fileCache[dir] = dirResults;
      
      // Filter by search term
      return dirResults.filter((file: any) => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (err) {
      console.error(`Error searching directory ${dir}:`, err);
      return [];
    }
  });
  
  // Wait for all search promises to complete
  const results = await Promise.all(searchPromises);
  
  // Combine results from all directories
  for (const result of results) {
    allResults = [...allResults, ...result];
  }
  
  // Limit the final result set
  return allResults.slice(0, maxResults);
};

// Set up file search handler
ipcMain.handle("search-files", async (event, searchTerm) => {
  try {
    console.log("Searching for files with term:", searchTerm);
    const results = await searchFiles(searchTerm);
    console.log(`Found ${results.length} matches for "${searchTerm}"`);
    return results;
  } catch (error) {
    console.error("Error searching files:", error);
    return [];
  }
});

// File reading with size limits and optimizations
ipcMain.handle("read-file", async (event, filePath) => {
  try {
    console.log("Reading file:", filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    // Get file stats to check size
    const stats = fs.statSync(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    // Set size limits
    const MAX_TEXT_SIZE_MB = 5; // 5MB for text files
    const MAX_BINARY_SIZE_MB = 10; // 10MB for binary files
    
    // Handle different file types
    const ext = path.extname(filePath).toLowerCase();
    
    // For text-based files, read as UTF-8
    const textExtensions = [".txt", ".md", ".js", ".ts", ".html", ".htm", ".css", ".json", ".csv", ".xml"];
    if (textExtensions.includes(ext)) {
      // Check file size for text files
      if (sizeInMB > MAX_TEXT_SIZE_MB) {
        return {
          content: `File is too large (${sizeInMB.toFixed(2)}MB). Maximum size for text files is ${MAX_TEXT_SIZE_MB}MB.`,
          type: "text",
          truncated: true
        };
      }
      
      // Read file
      let content = fs.readFileSync(filePath, "utf-8");
      
      // Truncate if the content is still too long
      const MAX_CHAR_LENGTH = 100000; // Limit to 100K characters
      if (content.length > MAX_CHAR_LENGTH) {
        content = content.substring(0, MAX_CHAR_LENGTH) + 
          `\n\n[... File truncated (${content.length} characters) ...]`;
        
        return {
          content: content,
          type: "text",
          truncated: true
        };
      }
      
      return {
        content: content,
        type: "text"
      };
    }
    
    // For binary files, return base64 encoding with size limits
    if (sizeInMB > MAX_BINARY_SIZE_MB) {
      return {
        content: `File is too large (${sizeInMB.toFixed(2)}MB). Maximum size for binary files is ${MAX_BINARY_SIZE_MB}MB.`,
        type: "text",
        truncated: true
      };
    }
    
    // For PDF, DOC, and other binary formats, just provide metadata instead of full content
    const documentExtensions = [".pdf", ".doc", ".docx", ".rtf", ".odt"];
    if (documentExtensions.includes(ext)) {
      return {
        content: `[File: ${path.basename(filePath)}, Type: ${ext.slice(1)}, Size: ${sizeInMB.toFixed(2)}MB]`,
        type: "reference",
        extension: ext.slice(1),
        size: stats.size,
        originalPath: filePath
      };
    }
    
    // For other binary files, return base64 encoding
    return {
      content: fs.readFileSync(filePath).toString("base64"),
      type: "binary",
      extension: ext.slice(1)
    };
  } catch (error) {
    console.error("Error reading file:", error);
    return {
      content: `Error reading file: ${error.message}`,
      type: "error"
    };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
