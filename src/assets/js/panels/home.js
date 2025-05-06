import { logger, database, changePanel } from "../utils.js";

const { Launch } = require("tropolia_core");
const { ipcRenderer } = require("electron");
const launch = new Launch();
const pkg = require("../package.json");
const { shell } = require("electron");

const dataDirectory =
  process.env.APPDATA ||
  (process.platform == "darwin"
    ? `${process.env.HOME}/Library/Application Support`
    : process.env.HOME);

class Home {
  static id = "home";
  async init(config, news, whitelisted) {
    this.config = config;
    this.news = await news;
    this.whitelisted = await whitelisted;
    this.database = await new database().init();
    this.newsInitialisation();
    this.startInitialisation();
    this.buttonInitialisation();
  }

  async newsInitialisation() {
    let news = document.querySelector(".news-content");
    if (this.news) {
      if (!this.news.length) {
        return;
      } else {
        for (let i = 0; i < this.news.length && i < 3; i++) {
          let News = this.news[i];
          let date = await this.getdate(News.publish_date);
          let blockNews = document.createElement("div");
          blockNews.classList.add("news-block");
          blockNews.innerHTML = `
                        <div class="news">
                            <img class="news-image" src="${News.image}">
                            <div class="gradient-overlay"></div>
                            <div class="news-title">${News.title}</div>
                            <div class="news-date">
                                <div class="news-day">${date.day}</div>
                                <div class="news-month">${date.month}</div>
                            </div>
                            <button class="news-url" data-url="${News.url}"></button>
                        </div>`;

          news.appendChild(blockNews);
        }
        const checkButtons = document.querySelectorAll(".news-url");
        checkButtons.forEach((button) => {
          button.addEventListener("click", () => {
            const url = button.getAttribute("data-url");
            if (url) {
              shell.openExternal(url);
            }
          });
        });
      }
    }
  }
  async startInitialisation() {
    document
      .querySelector(".launch-button")
      .addEventListener("click", async () => {
        let urlpkg = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
        let uuid = (await this.database.get("1234", "accounts-selected")).value;
        let account = (await this.database.get(uuid.selected, "accounts"))
          .value;
        let ram = (await this.database.get("1234", "ram")).value;
        let Resolution = (await this.database.get("1234", "screen")).value;
        let launcherSettings = (await this.database.get("1234", "launcher"))
          .value;
        let javaPath = (await this.database.get("1234", "java-path"))?.value
          ?.path;
        let playBtn = document.querySelector(".launch-button");
        let info = document.querySelector(".text-download");
        let progressBar = document.querySelector(".progress-bar");

        playBtn.style.background = `#86551d`;
        playBtn.style.color = `#aeaeae`;
        playBtn.disabled = true;

        if (playBtn.classList.contains("stop-animation")) {
          playBtn.classList.remove("stop-animation");
        } else {
          playBtn.classList.add("stop-animation");
        }

        if (Resolution.screen.width == "<auto>") {
          screen = false;
        } else {
          screen = {
            width: Resolution.screen.width,
            height: Resolution.screen.height,
          };
        }

        let opts = {
          url:
            this.config.game_url === "" || this.config.game_url === undefined
              ? `${urlpkg}/files`
              : this.config.game_url,
          authenticator: account,
          timeout: 10000,
          path: `${dataDirectory}/${
            process.platform == "darwin"
              ? this.config.dataDirectory
              : `.${this.config.dataDirectory}`
          }`,
          version: this.config.game_version,
          detached:
            launcherSettings.launcher.close === "close-all" ? false : true,
          downloadFileMultiple: 30,

          mcp: "./minecraft.jar",

          verify: this.config.verify,
          ignored: ["loader", ...this.config.ignored],

          javaPath: javaPath,

          java: true,

          screen: screen,
          memory: {
            min: `${ram.ramMin * 1024}M`,
            max: `${ram.ramMax * 1024}M`,
          },
        };
        info.style.display = "block";
        info.innerHTML = `Vérification`;
        launch.Launch(opts);
        launch.on("extract", (extract) => {
          console.log(extract);
        });
        launch.on("progress", (progress, size) => {
          progressBar.style.display = "block";
          document.querySelector(
            ".text-download"
          ).innerHTML = `Téléchargement ${((progress / size) * 100).toFixed(
            0
          )}%`;
          ipcRenderer.send("main-window-progress", { progress, size });
          progressBar.value = progress;
          progressBar.max = size;
        });
        launch.on("check", (progress, size) => {
          progressBar.style.display = "block";
          document.querySelector(".text-download").innerHTML = `Vérification ${(
            (progress / size) *
            100
          ).toFixed(0)}%`;
          progressBar.value = progress;
          progressBar.max = size;
        });

        const timeSpan = document.getElementById("timeSpan");
        launch.on("estimated", (time) => {
          let hours = Math.floor(time / 3600);
          let minutes = Math.floor((time - hours * 3600) / 60);
          let seconds = Math.floor(time - hours * 3600 - minutes * 60);
          timeSpan.style.display = "block";
          timeSpan.textContent = `${hours}h ${minutes}m ${seconds}s`;
          console.log(`${hours}h ${minutes}m ${seconds}s`);
        });

        launch.on("speed", (speed) => {
          console.log(`${(speed / 1067008).toFixed(2)} Mb/s`);
        });

        launch.on("patch", (patch) => {
          console.log(patch);
          info.innerHTML = `Patch en cours...`;
        });

        launch.on("data", (e) => {
          new logger("Minecraft", "#36b030");
          if (launcherSettings.launcher.close === "close-launcher")
            ipcRenderer.send("main-window-hide");
          ipcRenderer.send("main-window-progress-reset");
          timeSpan.style.display = "none";
          info.innerHTML = `Démarrage en cours...`;
          console.log(e);
          playBtn.classList.remove("stop-animation");
          playBtn.disabled = false;
          playBtn.style.background = `#cf8127`;
          playBtn.style.color = `#FFFFFF`;
          playBtn.style.display = "block";
          progressBar.style.display = "block";
          progressBar.background = `#515151`;
          progressBar.value = 0;
          progressBar.max = 0;
          info.style.display = "block";
          info.innerHTML = `Attente de lancement.`;
          timeSpan.style.display = "none";
          new logger("Launcher", "#7289da");

          if (launcherSettings.launcher.close === "close-launcher") {
            setInterval(() => {
              ipcRenderer.send("main-window-close");
            }, 10000);
          }
        });
        launch.on("close", (e) => {
          if (launcherSettings.launcher.close === "close-launcher") {
            ipcRenderer.send("main-window-show");
          }
        });

        launch.on("error", (err) => {
          console.log(err);
        });
      });
  }

  buttonInitialisation() {
    document.querySelector(".home-panel").addEventListener("click", () => {
      changePanel("home");
    });
    document
      .querySelector(".player-disconnect")
      .addEventListener("click", () => {
        this.getActiveAccount()
          .then((uuid) => {
            this.database.delete(uuid, "accounts");
            changePanel("login");
          })
          .catch((error) => {
            console.error("Error fetching selected account:", error);
          });
      });
    document.querySelector(".setting-panel").addEventListener("click", () => {
      changePanel("settings");
    });
    document.querySelector(".info-button").addEventListener("click", () => {
      shell.openExternal("https://mineria.ovh/shop");
    });
  }

  async getdate(e) {
    let date = new Date(e);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let allMonth = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ];
    return { year: year, month: allMonth[month - 1], day: day };
  }

  async getActiveAccount() {
    try {
      const result = await this.database.get("1234", "accounts-selected");
      return result.value.selected;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
}
export default Home;
