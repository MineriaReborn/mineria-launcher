import { Logger, Database, changePanel } from "../utils";
import { Launch } from "../libs/tropolia-core";
import { ipcRenderer } from "electron";
import { shell } from "electron";
import {AccountSelected} from "../utils/database";
import { MineriaClientDownloader } from '../libs/mineria-client.downloader';
import { MineriaClientRunner } from '../libs/mineria-client.runner';

const launch = new Launch();
const dataDirectory =
    process.env.APPDATA ||
    (process.platform === "darwin"
        ? `${process.env.HOME}/Library/Application Support`
        : process.env.HOME);

interface News {
    publish_date: string;
    image: string;
    title: string;
    url: string;
}

interface Resolution {
    screen: {
        width: string;
        height: string;
    };
}

interface Ram {
    ramMin: number;
    ramMax: number;
}

interface LauncherSettings {
    launcher: {
        close: string;
    };
}

interface Account {
    selected: string;
}

class Home {
    static id = "home";
    private config: any;
    private news: News[] = [];
    private whitelisted: boolean = false;
    private database: Database;

    constructor() {
        this.database = new Database();
    }

    async init(config: any, news: Promise<News[]>, whitelisted: Promise<boolean>): Promise<void> {
        this.config = config;
        this.news = await news;
        this.whitelisted = await whitelisted;
        await this.database.init();
        this.newsInitialisation();
        this.startInitialisation();
        this.buttonInitialisation();
    }

    private async newsInitialisation(): Promise<void> {
        const newsContainer = document.querySelector(".news-content");
        if (this.news && newsContainer) {
            if (this.news.length === 0) return;

            for (let i = 0; i < this.news.length && i < 3; i++) {
                const currentNews = this.news[i];
                const date = await this.getDate(currentNews.publish_date);
                const blockNews = document.createElement("div");
                blockNews.classList.add("news-block");
                blockNews.innerHTML = `
          <div class="news">
            <img class="news-image" src="${currentNews.image}">
            <div class="gradient-overlay"></div>
            <div class="news-title">${currentNews.title}</div>
            <div class="news-date">
              <div class="news-day">${date.day}</div>
              <div class="news-month">${date.month}</div>
            </div>
            <button class="news-url" data-url="${currentNews.url}"></button>
          </div>
        `;
                newsContainer.appendChild(blockNews);
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

    private async startInitialisation(): Promise<void> {

        const playBtn = document.querySelector(".launch-button") as HTMLButtonElement;
        const progressBar = document.querySelector(".progress-bar") as HTMLProgressElement;
        const info = document.querySelector(".text-download") as HTMLElement;
        const timeSpan = document.getElementById("timeSpan");

        playBtn?.addEventListener("click", async () => {
            const urlpkg = "https://mineria.fr/files/files";
            const uuid = (await this.database.get<AccountSelected>("1234", "accounts-selected"))?.value.selected;
            const account = (await this.database.get<{access_token: string; uuid: string; name: string;}>(uuid ?? '', "accounts"))?.value;
            const ram = (await this.database.get<Ram>("1234", "ram"))?.value;
            const resolution = (await this.database.get<Resolution>("1234", "screen"))?.value;
            const launcherSettings = (await this.database.get<LauncherSettings>("1234", "launcher"))?.value
            const javaPath = (await this.database.get<{ path: string }>("1234", "java-path"))?.value?.path;

            console.log(account)
            playBtn.disabled = true;

            if (playBtn.classList.contains("stop-animation")) {
                playBtn.classList.remove("stop-animation");
            } else {
                playBtn.classList.add("stop-animation");
            }

            let screen: { width: number; height: number } | boolean = resolution?.screen.width === "<auto>" ? false : {
                width: Number(resolution?.screen.width),
                height: Number(resolution?.screen.height),
            };

            const opts = {
                url: this.config.game_url || urlpkg,
                authenticator: account,
                timeout: 10000,
                path: `${dataDirectory}/${process.platform === "darwin" ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
                version: this.config.game_version,
                detached: launcherSettings?.launcher.close !== "close-all",
                downloadFileMultiple: 30,
                mcp: "./minecraft.jar",
                verify: this.config.verify,
                ignored: ["loader", ...this.config.ignored],
                javaPath,
                java: true,
                screen,
                memory: {
                    min: `${(ram?.ramMin ?? 1)* 1024}M`,
                    max: `${(ram?.ramMax ?? 1) * 1024}M`,
                },
            };

            info.style.display = "block";
            info.innerHTML = `Vérification`;
            // @ts-ignore

            //launch.Launch(opts);

            await new MineriaClientDownloader().downloadClient();

            new MineriaClientRunner({
                account: {
                    access_token: account.access_token,
                    uuid: account.uuid,
                },
                java: {
                    path: '/usr/bin/java',
                },
                rootDir: './client',
            }).run();

            launch.on("extract", (extract) => {
                console.log(extract);
            });

            launch.on("progress", (progress, size) => {
                progressBar.style.display = "block";
                info.innerHTML = `Téléchargement ${(progress / size * 100).toFixed(0)}%`;
                ipcRenderer.send("main-window-progress", { progress, size });
                progressBar.value = progress;
                progressBar.max = size;
            });

            launch.on("check", (progress, size) => {
                progressBar.style.display = "block";
                info.innerHTML = `Vérification ${(progress / size * 100).toFixed(0)}%`;
                progressBar.value = progress;
                progressBar.max = size;
            });

            launch.on("estimated", (time) => {
                const hours = Math.floor(time / 3600);
                const minutes = Math.floor((time - hours * 3600) / 60);
                const seconds = Math.floor(time - hours * 3600 - minutes * 60);
                if(!timeSpan) return;
                timeSpan.style.display = "block";
                timeSpan.textContent = `${hours}h ${minutes}m ${seconds}s`;
            });

            launch.on("speed", (speed) => {
                console.log(`${(speed / 1067008).toFixed(2)} Mb/s`);
            });

            launch.on("patch", () => {
                info.innerHTML = `Patch en cours...`;
            });

            launch.on("data", (e) => {
                new Logger("Minecraft", "#36b030");

                if (launcherSettings?.launcher.close === "close-launcher") {
                    ipcRenderer.send("main-window-hide");
                }

                if(!timeSpan) return;

                ipcRenderer.send("main-window-progress-reset");
                timeSpan.style.display = "none";
                info.innerHTML = `Démarrage en cours...`;
                playBtn.classList.remove("stop-animation");
                playBtn.disabled = false;
                playBtn.style.background = `#cf8127`;
                playBtn.style.color = `#FFFFFF`;
                playBtn.style.display = "block";
                progressBar.style.display = "block";
                progressBar.value = 0;
                progressBar.max = 0;
                info.style.display = "block";
                info.innerHTML = `Attente de lancement.`;
                timeSpan.style.display = "none";
                new Logger("Launcher", "#7289da");

                if (launcherSettings?.launcher.close === "close-launcher") {
                    setInterval(() => {
                        ipcRenderer.send("main-window-close");
                    }, 10000);
                }
            });

            launch.on("close", () => {
                if (launcherSettings?.launcher.close === "close-launcher") {
                    ipcRenderer.send("main-window-show");
                }
            });

            launch.on("error", (err) => {
                console.log(err);
            });
        });
    }

    private buttonInitialisation(): void {
        document.querySelector(".home-panel")?.addEventListener("click", () => {
            changePanel("home");
        });

        document.querySelector(".player-disconnect")?.addEventListener("click", () => {
            this.getActiveAccount()
                .then((uuid) => {
                    this.database.delete(uuid, "accounts");
                    changePanel("login");
                })
                .catch((error) => {
                    console.error("Error fetching selected account:", error);
                });
        });

        document.querySelector(".setting-panel")?.addEventListener("click", () => {
            changePanel("settings");
        });

        document.querySelector(".info-button")?.addEventListener("click", () => {
            shell.openExternal("https://mineria.fr/shop");
        });
    }

    private async getDate(dateStr: string): Promise<{ year: number, month: string, day: number }> {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = [
            "janvier", "février", "mars", "avril", "mai", "juin", "juillet",
            "août", "septembre", "octobre", "novembre", "décembre"
        ][date.getMonth()];
        const day = date.getDate();
        return { year, month, day };
    }

    private async getActiveAccount(): Promise<string> {
        try {
            return (await this.database.get<AccountSelected>("1234", "accounts-selected"))?.value.selected ?? '';
        } catch (error) {
            console.error("Error fetching data:", error);
            throw error;
        }
    }
}

export default Home;