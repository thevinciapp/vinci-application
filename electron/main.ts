import { app, BrowserWindow, ipcMain, globalShortcut, screen } from "electron";
import { join } from "path";
import * as fs from "fs";

// Separate window declarations
let mainWindow: BrowserWindow | null = null;
let commandCenterWindow: BrowserWindow | null = null;
let isDialogOpen = false; // Track if a dialog is open

/**
 * Create the command center window
 */
function createCommandCenterWindow() {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.show();
    commandCenterWindow.focus();
    return;
  }

  const preloadPath = join(__dirname, "preload.js");
  commandCenterWindow = new BrowserWindow({
    width: 680,
    height: 600,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    vibrancy: "under-window",
    visualEffectState: "active",
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  commandCenterWindow.once("ready-to-show", () => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.show();
      const { x, y, width } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
      const winBounds = commandCenterWindow.getBounds();
      commandCenterWindow.setPosition(
        Math.floor(x + (width - winBounds.width) / 2),
        Math.floor(y + 100)
      );
    }
  });

  commandCenterWindow.loadURL("http://localhost:3000/command-center");

  // Modified blur handler: only hide if no dialog is open
  commandCenterWindow.on("blur", () => {
    if (commandCenterWindow && !isDialogOpen) {
      commandCenterWindow.hide();
      BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send("sync-command-center-state", "close");
        }
      });
    }
  });

  commandCenterWindow.on("close", (event) => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      event.preventDefault();
      commandCenterWindow.hide();
      BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send("sync-command-center-state", "close");
        }
      });
    }
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  const preloadPath = join(__dirname, "preload.js");
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

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });
  mainWindow.loadURL("http://localhost:3000");
  mainWindow.on("closed", () => (mainWindow = null));
}

/**
 * Register global shortcuts
 */
function registerGlobalShortcuts() {
  const commandTypeShortcuts = {
    "CommandOrControl+Option+A": null,
    "CommandOrControl+Option+S": "spaces",
    "CommandOrControl+Option+C": "conversations",
    "CommandOrControl+Option+M": "models",
    "CommandOrControl+Option+T": "backgroundTasks",
    "CommandOrControl+Option+G": "suggestions",
    "CommandOrControl+Option+H": "actions",
    "CommandOrControl+Option+Q": "chatModes",
    "CommandOrControl+Option+W": "messageSearch",
    "CommandOrControl+Option+E": "similarMessages",
  };

  Object.entries(commandTypeShortcuts).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut, () => {
      console.log(`${shortcut} pressed - ${commandType || "general toggle"}`);
      if (commandCenterWindow && !commandCenterWindow.isDestroyed() && commandCenterWindow.isVisible()) {
        if (commandType) {
          BrowserWindow.getAllWindows().forEach((window) => {
            if (!window.isDestroyed()) {
              window.webContents.send("check-command-type", commandType);
            }
          });
          setTimeout(() => {
            if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
              commandCenterWindow.hide();
              BrowserWindow.getAllWindows().forEach((window) => {
                if (!window.isDestroyed()) {
                  window.webContents.send("sync-command-center-state", "close");
                }
              });
            }
          }, 50);
        } else {
          toggleCommandCenterWindow();
        }
      } else {
        createCommandCenterWindow();
        setTimeout(() => {
          if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
            if (commandType) {
              commandCenterWindow.webContents.send("set-command-type", commandType);
              BrowserWindow.getAllWindows().forEach((window) => {
                if (!window.isDestroyed() && commandCenterWindow && window.webContents.id !== commandCenterWindow.webContents.id) {
                  window.webContents.send("sync-command-center-state", "open", commandType);
                }
              });
            }
          }
        }, 100);
      }
    });
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());
}

/**
 * Toggle command center window
 */
function toggleCommandCenterWindow() {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed() && commandCenterWindow.isVisible()) {
    commandCenterWindow.hide();
  } else {
    createCommandCenterWindow();
  }
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send("sync-command-center-state", commandCenterWindow?.isVisible() ? "open" : "close");
    }
  });
}

// IPC Handlers for Command Center
ipcMain.on("close-command-center", () => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.hide();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "close");
      }
    });
  }
});

// IPC Handlers for Dialogs
ipcMain.on("open-dialog", (event, dialogType: string, data: any) => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.show();
    commandCenterWindow.webContents.send("open-dialog", dialogType, data);
  } else {
    createCommandCenterWindow();
    setTimeout(() => {
      if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
        commandCenterWindow.webContents.send("open-dialog", dialogType, data);
      }
    }, 100);
  }
});

ipcMain.on("dialog-opened", () => {
  isDialogOpen = true;
});

ipcMain.on("dialog-closed", () => {
  isDialogOpen = false;
  if (commandCenterWindow && !commandCenterWindow.isDestroyed() && !commandCenterWindow.isFocused()) {
    commandCenterWindow.hide();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "close");
      }
    });
  }
});

// Existing IPC Handlers
ipcMain.on("show-command-center", () => createCommandCenterWindow());
ipcMain.on("close-command-center", () => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) commandCenterWindow.hide();
});
ipcMain.on("toggle-command-center", toggleCommandCenterWindow);
ipcMain.on("set-command-type", (event, commandType) => {
  createCommandCenterWindow();
  setTimeout(() => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.webContents.send("set-command-type", commandType);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("set-command-type", commandType);
    }
  }, 100);
});
ipcMain.on("refresh-command-center", () => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.webContents.send("refresh-command-center");
  }
});
ipcMain.on("sync-command-center-state", (event, action, data) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.webContents.id !== event.sender.id && !window.isDestroyed()) {
      window.webContents.send("sync-command-center-state", action, data);
    }
  });
});
ipcMain.on("command-type-check", (event, commandType) => {
  if (
    commandCenterWindow &&
    !commandCenterWindow.isDestroyed() &&
    event.sender.id === commandCenterWindow.webContents.id
  ) {
    commandCenterWindow.hide();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "close");
      }
    });
  }
});

// App lifecycle
app.whenReady().then(() => {
  if (process.platform !== "darwin") {
    app.quit();
    return;
  }
  registerGlobalShortcuts();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});