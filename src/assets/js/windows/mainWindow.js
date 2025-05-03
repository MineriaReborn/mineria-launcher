
const { app, BrowserWindow } = require("electron");

const path = require("path");
const os = require("os");
const pkg = require("../../../../package.json");

let mainWindow = undefined;

function getWindow() {
  return mainWindow;
}

function destroyWindow() {
  if (!mainWindow) {
    return;
  }

  app.exit(0);
}

function createWindow() {
  destroyWindow();

  mainWindow = new BrowserWindow({
    title: pkg.preductname,
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    frame: false, 
    transparent: true,
    resizable: false,
    icon: `./src/assets/images/icon.${
      os.platform() === "win32" ? "ico" : "png"
    }`,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "src", "launcher.html"));
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

module.exports = {
  getWindow,
  createWindow,
  destroyWindow,
};
