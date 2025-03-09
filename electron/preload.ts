import { contextBridge, ipcRenderer } from "electron";

// Add debugging to see if preload is being executed
console.log("Preload script is running");

// Expose safe electron APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Search for files based on a pattern using IPC
  searchFiles: async (searchTerm: string) => {
    console.log("Searching for files with term:", searchTerm);
    try {
      const results = await ipcRenderer.invoke("search-files", searchTerm);
      console.log("Search results:", results);
      return results;
    } catch (error) {
      console.error("Error searching files:", error);
      return [];
    }
  },
  
  // Read file content using IPC
  readFile: async (filePath: string) => {
    console.log("Reading file:", filePath);
    try {
      const result = await ipcRenderer.invoke("read-file", filePath);
      console.log("File read successfully");
      return result;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  },
  
  // Test function to check if Electron API is available
  ping: () => {
    console.log("electronAPI.ping called");
    return "pong";
  },
  
  // Command center toggle functionality
  toggleCommandCenter: () => {
    console.log("Toggling command center from preload");
    ipcRenderer.send("toggle-command-center");
  },
  
  // Close the command center window
  closeCommandCenter: () => {
    console.log("Closing command center from preload");
    ipcRenderer.send("close-command-center");
  },
  
  // Register listener for command center open event
  onOpenCommandCenter: (callback: () => void) => {
    ipcRenderer.on("open-command-center", callback);
    return () => {
      ipcRenderer.removeListener("open-command-center", callback);
    };
  }
});