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

// Non-blocking file search implementation with worker pool for better performance
const searchFiles = async (searchTerm: string, maxResults = 50) => {
  // Define supported file extensions for text-based files
  const supportedExtensions = [
    ".txt", ".md", ".pdf", ".doc", ".docx", 
    ".rtf", ".odt", ".html", ".htm", ".xml",
    ".json", ".csv", ".js", ".ts", ".jsx", ".tsx", ".py", 
    ".java", ".c", ".cpp", ".h", ".rb", ".go", ".rs", 
    ".swift", ".php", ".css", ".scss", ".less"
  ];

  // Common directories to exclude from search
  const ignoredDirs = [
    "node_modules",
    ".git",
    "dist",
    "build",
    "target",
    "__pycache__",
    ".vscode",
    ".idea",
    "coverage",
    ".next",
    ".cache",
    "tmp",
    "temp",
    ".DS_Store",
    ".npm",
    ".yarn",
    "venv",
    "env",
    "logs"
  ];

  // Regular expressions for ignored patterns
  const ignoredPatterns = [
    /^\..*/, // Hidden files/dirs starting with .
    /.*\.(log|tmp|temp|bak|swp|swo|cache|min\.js|min\.css)$/i, // Temp/cache files
    /.*_cache\/.*/, // Cache folders
    /.*\/\.(git|svn|hg|bzr|idea|vscode)\/.*/ // Version control and IDE directories
  ];

  // Get the user's directory paths
  const homeDir = app.getPath("home");
  const documentsDir = app.getPath("documents");
  const downloadsDir = app.getPath("downloads");
  const desktopDir = app.getPath("desktop");
  
  // Common directories to search with priority
  const commonDirs = [
    documentsDir,
    desktopDir,
    downloadsDir,
    // Optional: Add code project directories
    path.join(homeDir, "Projects"),
    path.join(homeDir, "Development"),
    path.join(homeDir, "code"),
    path.join(homeDir, "workspace"),
    path.join(homeDir, "src")
  ].filter(dir => fs.existsSync(dir)); // Only include directories that exist
  
  // Function to check if a path should be ignored
  const shouldIgnore = (pathToCheck: string): boolean => {
    const basename = path.basename(pathToCheck);
    
    // Check against ignored directories list
    if (ignoredDirs.includes(basename)) return true;
    
    // Check against ignored patterns
    for (const pattern of ignoredPatterns) {
      if (pattern.test(basename) || pattern.test(pathToCheck)) return true;
    }
    
    return false;
  };

  // Refresh cache if needed, but keep for better performance
  const now = Date.now();
  if (now - lastCacheUpdate > CACHE_TTL) {
    fileCache = {};
    lastCacheUpdate = now;
  }

  // Track cancellation
  let cancelled = false;
  
  // Fast initial query from cache - immediate results
  const initialResults: any[] = [];
  
  // First, quickly check cache for matches to provide instant results
  Object.values(fileCache).forEach(files => {
    if (initialResults.length >= maxResults) return;
    
    const matches = files.filter((file: any) => {
      // Do a more thorough match on both name and path
      const searchTermLower = searchTerm.toLowerCase();
      return file.name.toLowerCase().includes(searchTermLower) || 
             file.path.toLowerCase().includes(searchTermLower);
    });
    
    initialResults.push(...matches.slice(0, maxResults - initialResults.length));
  });
  
  // Launch filesystem search in parallel for each base directory
  const searchPromises = commonDirs.map(async (dir) => {
    try {
      // Prepare to collect files
      const dirResults: any[] = [];
      
      // Use cached results if available and then update asynchronously
      if (fileCache[dir]) {
        // Return cached matches immediately for responsiveness
        const cachedResults = fileCache[dir].filter((file: any) => {
          const searchTermLower = searchTerm.toLowerCase();
          return file.name.toLowerCase().includes(searchTermLower) || 
                 file.path.toLowerCase().includes(searchTermLower);
        });
        
        // Start updating cache in background for next search
        setTimeout(() => {
          scanDirectory(dir, dirResults, maxResults, supportedExtensions);
        }, 0);
        
        return cachedResults;
      }
      
      // No cache - scan directory with limited results for responsiveness
      await scanDirectory(dir, dirResults, maxResults, supportedExtensions);
      
      // Update cache with full results
      fileCache[dir] = dirResults;
      
      // Filter by search term - check both filename and path
      return dirResults.filter((file: any) => {
        const searchTermLower = searchTerm.toLowerCase();
        return file.name.toLowerCase().includes(searchTermLower) || 
               file.path.toLowerCase().includes(searchTermLower);
      });
    } catch (err) {
      console.error(`Error searching directory ${dir}:`, err);
      return [];
    }
  });
  
  // Helper function to scan directories efficiently
  async function scanDirectory(
    dir: string, 
    results: any[], 
    maxResults: number, 
    extensions: string[]
  ): Promise<void> {
    // Use a queue-based approach for better performance
    const queue: string[] = [dir];
    let searchDepth = 0;
    const MAX_DEPTH = 4; // Limited but reasonable depth
    
    while (queue.length > 0 && results.length < maxResults * 10 && searchDepth < MAX_DEPTH && !cancelled) {
      const currentDir = queue.shift();
      if (!currentDir) continue;
      
      // Calculate depth for current directory
      if (currentDir !== dir) {
        const relativePath = path.relative(dir, currentDir);
        const depth = relativePath.split(path.sep).length;
        if (depth > searchDepth) {
          searchDepth = depth;
        }
      }
      
      try {
        // Read directory contents
        const files = fs.readdirSync(currentDir);
        
        // Process each file/directory
        for (const file of files) {
          if (results.length >= maxResults * 10 || cancelled) break;
          
          try {
            const filePath = path.join(currentDir, file);
            
            // Skip paths that should be ignored
            if (shouldIgnore(filePath)) continue;
            
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              // Add directory to queue for BFS, but not if it's ignored
              queue.push(filePath);
            } else {
              // Check if file has supported extension
              const ext = path.extname(file).toLowerCase();
              if (extensions.includes(ext)) {
                // Add file to results regardless of name for caching
                const fileInfo = {
                  path: filePath,
                  name: file,
                  type: ext.slice(1), // Remove the dot from extension,
                  size: stat.size,
                  modified: stat.mtime.getTime()
                };
                results.push(fileInfo);
              }
            }
          } catch (err) {
            // Ignore errors (permission issues, etc.)
            continue;
          }
        }
      } catch (err) {
        // Skip directories we can't read
        continue;
      }
    }
  }
  
  // Wait for all search promises to complete with timeout for responsiveness
  let allResults: any[] = [...initialResults]; // Start with cache results for instant response
  
  try {
    // Use Promise.race to limit waiting time
    const timeout = new Promise<any[]>((resolve) => {
      setTimeout(() => {
        cancelled = true; // Signal other operations to stop
        resolve([]); // Resolve with empty array to indicate timeout
      }, 500); // Timeout after 500ms for UI responsiveness
    });
    
    // Collect results from both timeout and actual searches
    const results = await Promise.race([
      Promise.all(searchPromises),
      timeout
    ]);
    
    // Only add results if we didn't timeout
    if (Array.isArray(results) && results.length > 0 && results[0].length > 0) {
      // Combine results from all directories, avoiding duplicates
      const seenPaths = new Set(allResults.map(r => r.path));
      
      for (const result of results) {
        for (const file of result) {
          if (!seenPaths.has(file.path)) {
            allResults.push(file);
            seenPaths.add(file.path);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in file search:", error);
  }
  
  // Sort results by relevance:
  // 1. Exact filename match
  // 2. Filename contains search term
  // 3. Path contains search term
  // 4. Recently modified
  const searchTermLower = searchTerm.toLowerCase();
  allResults.sort((a, b) => {
    // Exact filename match
    if (a.name.toLowerCase() === searchTermLower && b.name.toLowerCase() !== searchTermLower) return -1;
    if (b.name.toLowerCase() === searchTermLower && a.name.toLowerCase() !== searchTermLower) return 1;
    
    // Filename contains search term
    const aNameContains = a.name.toLowerCase().includes(searchTermLower);
    const bNameContains = b.name.toLowerCase().includes(searchTermLower);
    if (aNameContains && !bNameContains) return -1;
    if (bNameContains && !aNameContains) return 1;
    
    // Most recently modified
    return b.modified - a.modified;
  });
  
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
    
    // Expanded list of text-based file extensions
    const textExtensions = [
      ".txt", ".md", ".js", ".ts", ".jsx", ".tsx", ".html", ".htm", ".css", 
      ".json", ".csv", ".xml", ".py", ".rb", ".java", ".c", ".cpp", ".h", 
      ".go", ".rs", ".php", ".sql", ".yaml", ".yml", ".toml", ".ini", ".cfg",
      ".conf", ".log", ".sh", ".bash", ".zsh", ".bat", ".ps1", ".tex", ".scss", 
      ".less", ".sass", ".jsx", ".tsx"
    ];
    
    // Try to detect if the file is text-based regardless of extension
    const isTextFile = (buffer: Buffer): boolean => {
      // Check for BOM markers or scan first few KB for binary content
      const sampleSize = Math.min(buffer.length, 4096); // Check first 4KB
      if (sampleSize === 0) return true; // Empty file is text file
      
      let suspiciousBytes = 0;
      for (let i = 0; i < sampleSize; i++) {
        const byte = buffer[i];
        // Consider non-ASCII and control chars (except tabs, newlines)
        if ((byte < 7 || (byte > 14 && byte < 32) || byte > 127)) {
          suspiciousBytes++;
        }
      }
      
      // If more than 10% is suspicious, probably binary
      return (suspiciousBytes / sampleSize) < 0.1;
    };
    
    // Handle text-based files by extension or content detection
    if (textExtensions.includes(ext) || isTextFile(fs.readFileSync(filePath).slice(0, 4096))) {
      // Check file size for text files
      if (sizeInMB > MAX_TEXT_SIZE_MB) {
        return {
          content: `File is too large (${sizeInMB.toFixed(2)}MB). Maximum size for text files is ${MAX_TEXT_SIZE_MB}MB.`,
          type: "text",
          truncated: true
        };
      }
      
      // Try to read the file as UTF-8 first
      try {
        // Read file 
        let content = fs.readFileSync(filePath, "utf-8");
        
        // Truncate if the content is too long
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
      } catch (error) {
        // If UTF-8 reading fails, try to read as Latin1 (more forgiving)
        try {
          let content = fs.readFileSync(filePath, "latin1");
          
          // Truncate if needed
          const MAX_CHAR_LENGTH = 100000;
          if (content.length > MAX_CHAR_LENGTH) {
            content = content.substring(0, MAX_CHAR_LENGTH) + 
              `\n\n[... File truncated (${content.length} characters) ...]`;
          }
          
          return {
            content: content,
            type: "text",
            encoding: "latin1"
          };
        } catch (err) {
          // Both encoding attempts failed
          return {
            content: `Error reading file: ${error.message}`,
            type: "error"
          };
        }
      }
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
