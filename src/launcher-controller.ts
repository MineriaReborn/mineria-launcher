import fs from 'fs';
import path from 'path';
import { ipcRenderer } from 'electron';
import { Azuriom } from "./libs/tropolia-core";

import { Config, Logger, changePanel, Database, addAccount } from './utils';

import Login from './panels/login';
import Home from './panels/home';
import Settings from './panels/settings';
import {AccountSelected} from "./utils/database";

type PanelConstructor = {
    id: string;
    new (): { init: (config: any, news: any, whitelist: any) => void };
};

interface AccountData {
    uuid: string;
    meta: { type: string };
    value?: any;
    user_info?: any;
}

export default class Launcher {
    private configData: any;
    private newsData: any;
    private whitelistData: any;
    private db!: Database;

    public async init(): Promise<void> {
        this.initLogger();
        this.initWindowControls();

        this.configData = await Config.GetConfig();
        this.newsData = await Config.GetNews();
        this.whitelistData = await Config.getWhiteListed();
        this.db = await new Database().init();

        this.loadPanels(Login, Home, Settings);
        await this.loadAccounts();
    }

    private initLogger(): void {
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey && e.shiftKey && e.keyCode === 73) || e.keyCode === 123) {
                ipcRenderer.send("main-window-dev-tools");
            }
        });

        new Logger("Launcher", "#7289da");
    }

    private initWindowControls(): void {
        document.querySelector(".frame")?.classList.toggle("hide");
        document.querySelector(".dragbar")?.classList.toggle("hide");

        document.querySelector("#minimize")?.addEventListener("click", () => {
            ipcRenderer.send("main-window-minimize");
        });

        let maximized = false;
        const maximizeButton = document.querySelector("#maximize");

        maximizeButton?.addEventListener("click", () => {
            ipcRenderer.send("main-window-maximize");
            maximized = !maximized;
            maximizeButton.classList.toggle("icon-maximize");
            maximizeButton.classList.toggle("icon-restore-down");
        });

        document.querySelector("#close")?.addEventListener("click", () => {
            ipcRenderer.send("main-window-close");
        });
    }

    private loadPanels(...panels: PanelConstructor[]): void {
        const container = document.querySelector(".panels");

        panels.forEach(Panel => {
            const div = document.createElement("div");
            div.classList.add("panel", Panel.id);
            div.innerHTML = fs.readFileSync(path.join(__dirname, `panels/${Panel.id}.html`), "utf8");
            container?.appendChild(div);

            new Panel().init(this.configData, this.newsData, this.whitelistData);
        });
    }

    private async loadAccounts(): Promise<void> {
        const accounts = await this.db.getAll<AccountData>("accounts");
        const selectedAccount = (await this.db.get<AccountSelected>("1234", "accounts-selected"))?.value.selected;
        const azuriom = new Azuriom("https://mineria.fr");

        if (!accounts.length) {
            changePanel("login");
            this.hidePreload();
            return;
        }

        for (let accountObj of accounts) {
            const account = accountObj.value;

            if (account.meta.type === "AZauth") {
                const refreshed = await azuriom.verify(account);

                if (refreshed.error) {
                    await this.db.delete(account.uuid, "accounts");
                    if (account.uuid === selectedAccount) {
                        await this.db.update({ uuid: "1234" }, "accounts-selected");
                    }
                    console.error(`[Account] ${account.uuid}: ${refreshed.message}`);
                    continue;
                }

                const updatedAccount = {
                    access_token: refreshed.access_token,
                    client_token: refreshed.uuid,
                    uuid: refreshed.uuid,
                    name: refreshed.name,
                    user_properties: refreshed.user_properties,
                    meta: {
                        type: refreshed.meta?.type,
                        offline: !refreshed.meta?.online
                    },
                    user_info: {
                        monnaie: refreshed.user_info?.money,
                        role: refreshed.user_info?.role
                    }
                };

                await this.db.update(updatedAccount, "accounts");
                addAccount(updatedAccount);
            } else {
                await this.db.delete(account.uuid, "accounts");
                if (account.uuid === selectedAccount) {
                    await this.db.update({ uuid: "1234" }, "accounts-selected");
                }
            }
        }

        const selected = (await this.db.get<AccountSelected>("1234", "accounts-selected"))?.value?.selected;
        if (!selected) {
            const firstUuid = (await this.db.getAll<AccountSelected>("accounts"))[0]?.value?.uuid;
            if (firstUuid) {
                await this.db.update({ uuid: "1234", selected: firstUuid }, "accounts-selected");
            }
        }

        const finalAccounts = await this.db.getAll("accounts");
        if (!finalAccounts.length) {
            changePanel("login");
        } else {
            changePanel("home");
        }

        this.hidePreload();
    }

    private hidePreload(): void {
        const preload = document.querySelector(".preload-content") as HTMLElement;
        if (preload) preload.style.display = "none";
    }
}

new Launcher().init();