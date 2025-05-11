import { Database, changePanel, Slider } from '../utils';
import * as os from 'os';

const dataDirectory = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME);

interface Resolution {
    width: string;
    height: string;
}

interface RAM {
    ramMin: string;
    ramMax: string;
}

interface JavaPath {
    path: string | boolean;
}

interface LauncherSettings {
    close: 'close-launcher' | 'close-all' | 'open-launcher';
}

class Settings {
    static id: string = 'settings';
    private config: any;
    private database: Database;

    constructor() {
        this.database = new Database();
    }

    async init(config: any) {
        this.config = config;
        await this.database.init();
        this.initSettingsDefault();
        this.initTab();
        this.initRam();
        this.initJavaPath();
        this.initResolution();
        this.initLauncherSettings();
    }

    async initRam() {
        const ramDatabase= (await this.database.get<RAM>('1234', 'ram'))?.value ?? { ramMin: '1', ramMax: '2' };
        const totalMem: number = Math.trunc(os.totalmem() / 1073741824 * 10) / 10;
        const freeMem: number = Math.trunc(os.freemem() / 1073741824 * 10) / 10;

        document.getElementById("total-ram")!.textContent = `${totalMem} Go`;
        document.getElementById("free-ram")!.textContent = `${freeMem} Go`;

        const sliderDiv = document.querySelector(".memory-slider")!;
        sliderDiv.setAttribute("max", Math.trunc((80 * totalMem) / 100).toString());

        const slider = new Slider(".memory-slider", parseFloat(ramDatabase.ramMin), parseFloat(ramDatabase.ramMax));

        const minSpan = document.querySelector(".slider-touch-left span")!;
        const maxSpan = document.querySelector(".slider-touch-right span")!;

        minSpan.setAttribute("value", `${ramDatabase.ramMin} Go`);
        maxSpan.setAttribute("value", `${ramDatabase.ramMax} Go`);

        slider.on("change", (min: number, max: number) => {
            minSpan.setAttribute("value", `${min} Go`);
            maxSpan.setAttribute("value", `${max} Go`);
            this.database.update({ uuid: '1234', ramMin: `${min}`, ramMax: `${max}` }, 'ram');
        });
    }

    async initJavaPath() {
        const javaDatabase = (await this.database.get<JavaPath>('1234', 'java-path'))?.value ?? { path: false };
        const javaPath = javaDatabase.path ? javaDatabase.path : 'Utilisez la version Java intégrée';
        const path = document.querySelector(".path") as HTMLInputElement;
        const file = document.querySelector(".path-file") as HTMLInputElement;
        document.querySelector(".java-path-txt")!.textContent = `${dataDirectory?.replace(/\\/g, "/")}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/runtime`;

        path.value = javaPath as string;

        document.querySelector(".java-path-set")!.addEventListener("click", async () => {
            file.value = '';
            file.click();
            await new Promise<void>((resolve) => {
                let interval = setInterval(() => {
                    if (file.value !== '') resolve(clearInterval(interval));
                }, 100);
            });

            if (file.value.replace(".exe", '').endsWith("java") || file.value.replace(".exe", '').endsWith("javaw")) {
                const filePath = file.files![0].webkitRelativePath;
                path.value = filePath;
                this.database.update({ uuid: '1234', path: filePath }, 'java-path');
            } else {
                alert("Le nom du fichier doit être java ou javaw");
            }
        });

        document.querySelector(".path-button-reset")!.addEventListener("click", () => {
            path.value = 'Utilisez la version Java intégrée';
            file.value = '';
            this.database.update({ uuid: '1234', path: false }, 'java-path');
        });
    }

    async initResolution() {
        const resolutionDatabase= (await this.database.get<Resolution>('1234', 'screen'))?.value ?? { width: '1280', height: '720' };
        const width = document.querySelector(".width-size") as HTMLInputElement;
        const height = document.querySelector(".height-size") as HTMLInputElement;
        width.value = resolutionDatabase.width;
        height.value = resolutionDatabase.height;

        const select = document.getElementById("select") as HTMLSelectElement;
        select.addEventListener("change", (event) => {
            const resolution = select.options[select.options.selectedIndex].value.split(" x ");
            select.options.selectedIndex = 0;

            width.value = resolution[0];
            height.value = resolution[1];
            this.database.update({ uuid: '1234', screen: { width: resolution[0], height: resolution[1] } }, 'screen');
        });
    }

    async initLauncherSettings() {
        const launcherDatabase = (await this.database.get<LauncherSettings>('1234', 'launcher'))?.value ?? { close: 'close-launcher' };
        const settingsLauncher: LauncherSettings = { close: launcherDatabase.close };

        const closeLauncher = document.getElementById("launcher-close") as HTMLInputElement;
        const closeAll = document.getElementById("launcher-close-all") as HTMLInputElement;
        const openLauncher = document.getElementById("launcher-open") as HTMLInputElement;

        if (settingsLauncher.close === 'close-launcher') {
            closeLauncher.checked = true;
        } else if (settingsLauncher.close === 'close-all') {
            closeAll.checked = true;
        } else if (settingsLauncher.close === 'open-launcher') {
            openLauncher.checked = true;
        }

        closeLauncher.addEventListener("change", () => {
            if (closeLauncher.checked) {
                openLauncher.checked = false;
                closeAll.checked = false;
            }
            if (!closeLauncher.checked) closeLauncher.checked = true;
            settingsLauncher.close = 'close-launcher';
            this.database.update({ uuid: '1234', launcher: { close: 'close-launcher' } }, 'launcher');
        });

        closeAll.addEventListener("change", () => {
            if (closeAll.checked) {
                closeLauncher.checked = false;
                openLauncher.checked = false;
            }
            if (!closeAll.checked) closeAll.checked = true;
            settingsLauncher.close = 'close-all';
            this.database.update({ uuid: '1234', launcher: { close: 'close-all' } }, 'launcher');
        });

        openLauncher.addEventListener("change", () => {
            if (openLauncher.checked) {
                closeLauncher.checked = false;
                closeAll.checked = false;
            }
            if (!openLauncher.checked) openLauncher.checked = true;
            settingsLauncher.close = 'open-launcher';
            this.database.update({ uuid: '1234', launcher: { close: 'open-launcher' } }, 'launcher');
        });
    }

    initTab() {
        document.querySelector('.home-panel-settings')!.addEventListener('click', () => {
            changePanel("home");
        });
    }

    async initSettingsDefault() {
        if (!(await this.database.getAll('accounts-selected')).length) {
            this.database.add({ uuid: '1234' }, 'accounts-selected');
        }

        if (!(await this.database.getAll('java-path')).length) {
            this.database.add({ uuid: '1234', path: false }, 'java-path');
        }

        if (!(await this.database.getAll('launcher')).length) {
            this.database.add({ uuid: '1234', launcher: { close: 'close-launcher' } }, 'launcher');
        }

        if (!(await this.database.getAll('ram')).length) {
            this.database.add({ uuid: '1234', ramMin: '1', ramMax: '2' }, 'ram');
        }

        if (!(await this.database.getAll('screen')).length) {
            this.database.add({ uuid: '1234', screen: { width: '1280', height: '720' } }, 'screen');
        }
    }
}

export default Settings;