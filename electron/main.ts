import { app, BrowserWindow, ipcMain, globalShortcut, screen } from "electron";
import { join, extname, basename } from "path";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let mainWindow: BrowserWindow;
let commandCenterWindow: BrowserWindow | null = null; // Separate window for lightweight command center

// Create the main application window
const createWindow = () => {
  console.log("Creating Electron window");

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
};

/**
 * Creates a lightweight command center window that's detached from the main app
 * This allows for quick access to commands without launching the full application
 */
const createCommandCenterWindow = () => {
  // If window already exists, just focus it
  if (commandCenterWindow) {
    if (commandCenterWindow.isMinimized()) {
      commandCenterWindow.restore();
    }
    commandCenterWindow.focus();
    return;
  }

  console.log("Creating lightweight command center window");

  const preloadPath = join(__dirname, "preload.js");
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Create a small, centered window
  commandCenterWindow = new BrowserWindow({
    width: 640,
    height: 400,
    show: false, // Don't show until ready
    frame: false, // No window frame
    transparent: true, // Allows for rounded corners
    resizable: false,
    center: true, // Center on screen
    skipTaskbar: true, // Don't show in taskbar
    alwaysOnTop: true, // Keep on top of other windows
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Position in the center of the screen
  commandCenterWindow.setPosition(
    Math.floor(width / 2 - 320),
    Math.floor(height / 2 - 200)
  );

  // Load only the command center URL (special route)
  commandCenterWindow.loadURL("http://localhost:3000/command-center");

  // Show when ready to prevent flickering
  commandCenterWindow.once('ready-to-show', () => {
    if (commandCenterWindow) {
      commandCenterWindow.show();
      // Automatically focus the search input
      commandCenterWindow.webContents.focus();
    }
  });

  // Hide on blur (when user clicks outside)
  commandCenterWindow.on('blur', () => {
    if (commandCenterWindow) {
      commandCenterWindow.hide();
    }
  });

  // Clean up on close
  commandCenterWindow.on('closed', () => {
    commandCenterWindow = null;
  });
};

// Cache for storing search results
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL for cache entries

// Supported file extensions (customize as needed)
const SUPPORTED_EXTENSIONS = [
  ".txt", ".md", ".pdf", ".doc", ".docx",
  ".rtf", ".odt", ".html", ".htm", ".xml",
  ".json", ".csv", ".js", ".ts", ".jsx", ".tsx", ".py",
  ".java", ".c", ".cpp", ".h", ".rb", ".go", ".rs",
  ".swift", ".php", ".css", ".scss", ".less",
];

/**
 * Spotlight-based file search for macOS
 * Uses mdfind to query Spotlight index
 * @param {string} searchTerm - The search term to look for
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} Array of matching file objects
 */
async function spotlightFileSearch(searchTerm: string, maxResults = 100): Promise<any[]> {
  try {
    if (process.platform !== "darwin") {
      throw new Error("This application only supports macOS with Spotlight integration.");
    }

    searchTerm = searchTerm.toLowerCase().trim();

    // Use mdfind to query Spotlight
    // -onlyin ~ limits search to user’s home directory by default (adjustable)
    // kMDItemFSName matches file names
    const cmd = `mdfind "kMDItemFSName == '*${searchTerm}*'c" -onlyin ~ | head -n ${maxResults}`;
    console.log(`Executing Spotlight search: ${cmd}`);

    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      console.error("Spotlight search error:", stderr);
    }

    if (!stdout.trim()) return [];

    const filePaths = stdout.split("\n").filter(Boolean);

    // Filter by supported extensions and build results
    const results = filePaths
      .filter((filePath) => {
        const ext = extname(filePath).toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(ext);
      })
      .map((filePath) => ({
        path: filePath,
        name: basename(filePath),
        type: extname(filePath).substring(1).toLowerCase() || "unknown",
        size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
        modified: fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : Date.now(),
      }));

    // Sort by relevance (e.g., exact name match first)
    results.sort((a, b) => {
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      if (aNameLower === searchTerm && bNameLower !== searchTerm) return -1;
      if (bNameLower === searchTerm && aNameLower !== searchTerm) return 1;
      return aNameLower.localeCompare(bNameLower);
    });

    return results.slice(0, maxResults);
  } catch (error) {
    console.error("Error in Spotlight file search:", error);
    return [];
  }
}

// IPC handler for file search
ipcMain.handle("search-files", async (event, searchTerm) => {
  try {
    if (!searchTerm || typeof searchTerm !== "string" || searchTerm.trim().length < 2) {
      console.log("Search term too short, returning empty results");
      return [];
    }

    const cacheKey = searchTerm.trim().toLowerCase();
    if (searchCache.has(cacheKey)) {
      const { results, timestamp } = searchCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log(`Returning cached results for "${searchTerm}"`);
        return results;
      }
    }

    console.log(`Searching for files with term: "${searchTerm}"`);
    const results = await spotlightFileSearch(searchTerm);

    if (results.length > 0) {
      searchCache.set(cacheKey, {
        results,
        timestamp: Date.now(),
      });
    }

    console.log(`Found ${results.length} matches for "${searchTerm}"`);
    return results;
  } catch (error) {
    console.error("Error searching files:", error);
    return [];
  }
});

// File reading logic remains mostly unchanged but simplified for macOS
ipcMain.handle("read-file", async (event, filePath) => {
  try {
    console.log("Reading file:", filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    const MAX_TEXT_SIZE_MB = 5;

    const ext = extname(filePath).toLowerCase();
    const textExtensions = [
      ".txt", ".md", ".js", ".ts", ".jsx", ".tsx", ".html", ".css",
      ".json", ".csv", ".xml", ".py", ".rb", ".java", ".c", ".cpp",
    ];

    if (textExtensions.includes(ext)) {
      if (sizeInMB > MAX_TEXT_SIZE_MB) {
        return {
          content: `File too large (${sizeInMB.toFixed(2)}MB). Max: ${MAX_TEXT_SIZE_MB}MB.`,
          type: "text",
          truncated: true,
        };
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const MAX_CHAR_LENGTH = 100000;
      if (content.length > MAX_CHAR_LENGTH) {
        return {
          content: content.substring(0, MAX_CHAR_LENGTH) + "\n\n[Truncated...]",
          type: "text",
          truncated: true,
        };
      }

      return { content, type: "text" };
    }

    return {
      content: `[File: ${basename(filePath)}, Size: ${sizeInMB.toFixed(2)}MB]`,
      type: "reference",
      extension: ext.slice(1),
      size: stats.size,
      originalPath: filePath,
    };
  } catch (error) {
    console.error("Error reading file:", error);
    return { content: "Error reading file", type: "error" };
  }
});

// Cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, { timestamp }] of searchCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
}, 60000);

app.whenReady().then(() => {
  if (process.platform !== "darwin") {
    console.error("This app only runs on macOS.");
    app.quit();
    return;
  }
  createWindow();
  
  registerGlobalShortcuts();
});

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

/**
 * Register global shortcuts that will work even when app is not focused
 */
function registerGlobalShortcuts() {
  // Use Command+Option+A (uncommon shortcut that won't interfere with native commands)
  const shortcutKey = 'CommandOrControl+Option+A';
  
  // Register the shortcut to open the lightweight command center
  const success = globalShortcut.register(shortcutKey, () => {
    console.log(`${shortcutKey} was pressed - opening lightweight command center`);
    
    // Open the lightweight command center instead of the main application
    createCommandCenterWindow();
  });

  if (!success) {
    console.error(`Failed to register global shortcut: ${shortcutKey}`);
  } else {
    console.log(`Global shortcut registered successfully: ${shortcutKey}`);
  }

  // Clean up shortcuts when app quits
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}

// IPC handlers for command center operations
ipcMain.on('toggle-command-center', () => {
  // When toggled from within the app, still use the lightweight version
  createCommandCenterWindow();
});

// Allow command center to close itself
ipcMain.on('close-command-center', () => {
  if (commandCenterWindow) {
    commandCenterWindow.hide();
  }
});