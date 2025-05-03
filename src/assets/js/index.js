
const { ipcRenderer } = require("electron");
import { config } from "./utils.js";
const path = require("path");
let dev = process.env.NODE_ENV === "dev";

class Splash {
  constructor() {
    this.splash = document.querySelector(".splash");
    this.message = document.querySelector(".message");
    this.progress = document.querySelector("progress");
    document.addEventListener("DOMContentLoaded", () => this.startAnimation());
  }

  async startAnimation() {
    await sleep(100);
    document.querySelector("#splash").style.display = "block";
    await sleep(500);
    this.splash.classList.add("opacity");
    await sleep(500);
    this.splash.classList.add("translate");
    this.message.classList.add("opacity");
    await sleep(1000);
    this.maintenanceCheck();
  }

  async maintenanceCheck() {
    if (dev) {
      return this.startLauncher();
    }

    config
      .GetConfig()
      .then((res) => {
        if (res.maintenance) return this.shutdown(res.maintenance_message);
        else this.checkUpdate();
      })
      .catch((e) => {
        console.error(e);
        return this.shutdown(
          "Aucune connexion internet détectée : <br>Veuillez ré-essayer."
        );
      });
  }

  async checkUpdate() {
    ipcRenderer.send("update-app");

    ipcRenderer.on("updateAvailable", () => {
      this.setStatus(`Mise à jour disponible !`);
      ipcRenderer.send("start-update");
    });

    ipcRenderer.on("download-progress", (event, progress) => {
      this.toggleProgress();
      const percentage = Math.floor(
        (progress.transferred / progress.total) * 100
      );
      this.setStatus(`Téléchargement - ${percentage}%`);
      this.setProgress(progress.transferred, progress.total);
    });

    ipcRenderer.on("update-not-available", () => {
      this.startLauncher();
    });
  }

  startLauncher() {
    ipcRenderer.send("main-window-open");
    ipcRenderer.send("update-window-close");
    ipcRenderer.send("discord");
  }

  shutdown(text) {
    this.setStatus(`${text}<br>Arrêt dans 5s`);
    let i = 4;
    setInterval(() => {
      this.setStatus(`${text}<br>Arrêt dans ${i--}s`);
      if (i < 0) ipcRenderer.send("update-window-close");
    }, 1000);
  }

  setStatus(text) {
    this.message.innerHTML = text;
  }

  toggleProgress() {
    this.progress.style.opacity = 1;
  }

  setProgress(value, max) {
    this.progress.value = value;
    this.progress.max = max;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey && e.shiftKey && e.keyCode == 73) || e.keyCode == 123) {
    ipcRenderer.send("update-window-dev-tools");
  }
});
new Splash();
