import * as os from 'node:os';

import { changePanel } from '../../../utils';
import { StoreItem, Store } from '../../../utils/store';
import { ONE_GIGA_BYTES } from '../../../utils/constants';
import { Slider } from '../../../utils/slider';
export default class Settings {
  static id: string = 'settings';
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  public async init() {
    this.initTab();
    await this.initRam();
    await this.initResolution();
    await this.initLauncherSettings();
  }

  private async initRam() {
    const ram = this.store.get(StoreItem.Memory);

    const bytesToGigaBytes = (bytes: number) => Math.trunc((bytes / ONE_GIGA_BYTES) * 10) / 10;

    const totalMem = bytesToGigaBytes(os.totalmem());
    const freeMem = bytesToGigaBytes(os.freemem());

    const ramMin = ram.min;
    const ramMax = ram.max;

    document.getElementById('total-ram')!.textContent = `${totalMem} Go`;
    document.getElementById('free-ram')!.textContent = `${freeMem} Go`;

    const sliderDiv = document.querySelector('.memory-slider')!;
    sliderDiv.setAttribute('max', totalMem.toString());

    const slider = new Slider('.memory-slider', ramMin, ramMax);

    slider.on('change', (min: number, max: number) => {
      this.store.upsert(StoreItem.Memory, { min, max });
    });
  }

  private async initResolution() {
    const resolution = this.store.get(StoreItem.Resolution);

    const width = document.querySelector('.width-size') as HTMLInputElement;
    const height = document.querySelector('.height-size') as HTMLInputElement;
    width.value = resolution.width.toString();
    height.value = resolution.height.toString();

    const select = document.getElementById('select') as HTMLSelectElement;
    select.addEventListener('change', () => {
      const resolution = select.options[select.options.selectedIndex].value.split(' x ');
      select.options.selectedIndex = 0;
      width.value = resolution[0];
      height.value = resolution[1];
      this.store.upsert(StoreItem.Resolution, {
        width: Number(resolution[0]),
        height: Number(resolution[1]),
      });
    });
  }

  private async initLauncherSettings() {
    const launcher = this.store.get(StoreItem.Launcher);

    const closeLauncher = document.getElementById('launcher-close') as HTMLInputElement;
    const closeAll = document.getElementById('launcher-close-all') as HTMLInputElement;
    const openLauncher = document.getElementById('launcher-open') as HTMLInputElement;

    if (launcher.close === 'close-launcher') {
      closeLauncher.checked = true;
    } else if (launcher.close === 'close-all') {
      closeAll.checked = true;
    } else if (launcher.close === 'open-launcher') {
      openLauncher.checked = true;
    }

    closeLauncher.addEventListener('change', () => {
      if (closeLauncher.checked) {
        openLauncher.checked = false;
        closeAll.checked = false;
      }
      if (!closeLauncher.checked) closeLauncher.checked = true;
      launcher.close = 'close-launcher';
      this.store.upsert(StoreItem.Launcher, { close: 'close-launcher' });
    });

    closeAll.addEventListener('change', () => {
      if (closeAll.checked) {
        closeLauncher.checked = false;
        openLauncher.checked = false;
      }
      if (!closeAll.checked) closeAll.checked = true;
      launcher.close = 'close-all';
      this.store.upsert(StoreItem.Launcher, { close: 'close-all' });
    });

    openLauncher.addEventListener('change', () => {
      if (openLauncher.checked) {
        closeLauncher.checked = false;
        closeAll.checked = false;
      }
      if (!openLauncher.checked) openLauncher.checked = true;
      launcher.close = 'open-launcher';
      this.store.upsert(StoreItem.Launcher, { close: 'open-launcher' });
    });
  }

  private initTab() {
    document.querySelector('.home-panel-settings')!.addEventListener('click', () => {
      changePanel('home');
    });
  }
}
