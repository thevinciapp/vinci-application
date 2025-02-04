import { app, BrowserWindow } from "electron";
import { join } from "path";

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });
  
  mainWindow.loadURL("http://localhost:3000");
};

app.whenReady().then(createWindow);
