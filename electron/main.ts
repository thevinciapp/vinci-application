import { app, BrowserWindow, ipcMain, globalShortcut, screen } from "electron";
import { join, extname, basename } from "path";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Separate window declarations
let mainWindow: BrowserWindow | null = null;
let commandCenterWindow: BrowserWindow | null = null;

/**
 * Create a separate command center window
 * This window can be opened globally without showing the main application
 */
function createCommandCenterWindow() {
  // Only create if it doesn't exist or was destroyed
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.show();
    commandCenterWindow.focus();
    return;
  }

  const preloadPath = join(__dirname, "preload.js");
  console.log("Preload script path for command center:", preloadPath);

  commandCenterWindow = new BrowserWindow({
    width: 680,  // Smaller, focused window like Raycast
    height: 500,
    show: false,
    frame: false, // Frameless for better look
    transparent: true, // Support for transparent bg
    resizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Show when ready
  commandCenterWindow.once('ready-to-show', () => {
    // Non-null assertion since we know commandCenterWindow exists here
    commandCenterWindow!.show();
    // Center on active screen
    const { x, y, width } = screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint()
    ).workArea;
    const winBounds = commandCenterWindow!.getBounds();
    // Null check to satisfy TypeScript
    if (commandCenterWindow) {
      commandCenterWindow.setPosition(
        Math.floor(x + (width - winBounds.width) / 2),
        Math.floor(y + 100) // Place near top of screen
      );
    }
  });

  // Load command center URL - direct to the command center page
  commandCenterWindow.loadURL("http://localhost:3000/command-center");
  
  // Handle blur - hide when not in focus (like Raycast)
  commandCenterWindow.on('blur', () => {
    if (commandCenterWindow) {
      commandCenterWindow.hide();
    }
  });
  
  // Prevent actual close, just hide window
  commandCenterWindow.on('close', (event) => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      event.preventDefault();
      commandCenterWindow.hide();
    }
  });
}

/**
 * Create the main application window
 */
const createWindow = () => {
  console.log("Creating main application window");

  const preloadPath = join(__dirname, "preload.js");
  console.log("Preload script path:", preloadPath);
  console.log("Preload script exists:", fs.existsSync(preloadPath));

  // Create main window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  // Show when ready - mainWindow must exist at this point
  mainWindow!.once('ready-to-show', () => {
    console.log("Window ready to show");
    // Use non-null assertion since mainWindow must exist in this callback
    mainWindow!.show();
  });

  // Load the main app URL
  if (mainWindow) {
    mainWindow.loadURL("http://localhost:3000");
  }
  
  // Handle window close - actual app close
  mainWindow.on('closed', () => {
    mainWindow = null;
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
    // -onlyin ~ limits search to user's home directory by default (adjustable)
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
 * In our new architecture, we use global shortcuts to open the command center directly
 * without needing to open the main application window
 */
function registerGlobalShortcuts() {
  // Use Command+Option+A as the global command center shortcut
  const shortcutKey = 'CommandOrControl+Option+A';
  
  // Register main shortcut - now opens command center directly
  const success = globalShortcut.register(shortcutKey, () => {
    console.log(`${shortcutKey} was pressed - opening command center`);
    createCommandCenterWindow();
  });
  
  // Register shortcuts for specific command types
  const commandTypeShortcuts = {
    'CommandOrControl+Option+S': 'spaces',
    'CommandOrControl+Option+C': 'conversations',
    'CommandOrControl+Option+M': 'models',
    'CommandOrControl+Option+T': 'background-tasks',
    'CommandOrControl+Option+G': 'suggestions',
  };
  
  // Register each command type shortcut
  Object.entries(commandTypeShortcuts).forEach(([shortcutKey, commandType]) => {
    globalShortcut.register(shortcutKey, () => {
      console.log(`${shortcutKey} was pressed - opening ${commandType} command`);
      
      // Create/show command center window
      createCommandCenterWindow();
      
      // Set command type with slight delay to ensure window is ready
      setTimeout(() => {
        // First check if window exists and is not destroyed before sending message
        if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
          commandCenterWindow.webContents.send('set-command-type', commandType);
        }
      }, 100);
    });
  });

  if (!success) {
    console.error("Failed to register global shortcut");
  } else {
    console.log(`Global shortcut registered successfully: ${shortcutKey}`);
  }
  
  // Clean up shortcuts when app quits
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}

// Enhanced IPC handlers for integrated command center control
// Direct command to show the command center window
ipcMain.on('show-command-center', () => {
  console.log('show-command-center received - ensuring window is visible');
  // Create window if it doesn't exist, otherwise show it
  createCommandCenterWindow();
});

// Handler to close the command center
ipcMain.on('close-command-center', () => {
  console.log('close-command-center received - hiding window');
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.hide();
  }
});

// Toggle command center visibility
ipcMain.on('toggle-command-center', () => {
  console.log('toggle-command-center received');
  // If command center window exists and is visible, hide it
  if (commandCenterWindow && !commandCenterWindow.isDestroyed() && commandCenterWindow.isVisible()) {
    commandCenterWindow.hide();
  } else {
    // Otherwise create/show it
    createCommandCenterWindow();
  }
  
  // Also notify the main app for in-app command center
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Non-null assertion since we already checked it's not null above
    mainWindow!.webContents.send('toggle-command-center');
  }
});

// Set specific command type
ipcMain.on('set-command-type', (event, commandType) => {
  console.log(`set-command-type received: ${commandType}`);
  // First ensure command center window is created and visible
  createCommandCenterWindow();
  
  // Propagate to appropriate window with short delay to ensure window is ready
  setTimeout(() => {
    // Propagate to standing-alone command center window if it exists and is focused
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      console.log(`Sending command type ${commandType} to command center window`);
      commandCenterWindow.webContents.send('set-command-type', commandType);
    }
    
    // Also propagate to main window if it exists
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log(`Sending command type ${commandType} to main window`);
      mainWindow.webContents.send('set-command-type', commandType);
    }
  }, 100); // Small delay to ensure the window is ready
});

// Refresh command center data
ipcMain.on('refresh-command-center', () => {
  console.log('refresh-command-center received');
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.webContents.send('refresh-command-center');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('refresh-command-center');
  }
});

// New handler for syncing command center state across windows
ipcMain.on('sync-command-center-state', (event, action, data) => {
  console.log(`sync-command-center-state received: ${action}`, data ? `with data: ${data}` : '');
  
  // Broadcast to all windows except sender
  BrowserWindow.getAllWindows().forEach(window => {
    // Skip the sender window to avoid feedback loops
    if (window.webContents.id !== event.sender.id && !window.isDestroyed()) {
      window.webContents.send('sync-command-center-state', action, data);
    }
  });
});

// Handle app lifecycle events
app.whenReady().then(() => {
  // Register global shortcuts first
  registerGlobalShortcuts();
  
  // For regular app launch, create the main window
  createWindow();
  
  // For MacOS, recreate window when dock icon is clicked if no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle app quit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});