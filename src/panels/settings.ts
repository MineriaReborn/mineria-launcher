import * as os from 'node:os';

import { changePanel, Slider } from '../utils';
import { ItemKey, Store } from '../utils/store';
import { RAM } from '../types/ram';
import { Resolution } from '../types/resolution';
import { LauncherSettings } from '../types/launcher-settings';

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
    const ram = this.store.get<RAM>(ItemKey.Ram) ?? {
      ramMin: '1',
      ramMax: '2',
    };

    const totalMem: number = Math.trunc((os.totalmem() / 1073741824) * 10) / 10;
    const freeMem: number = Math.trunc((os.freemem() / 1073741824) * 10) / 10;

    document.getElementById('total-ram')!.textContent = `${totalMem} Go`;
    document.getElementById('free-ram')!.textContent = `${freeMem} Go`;

    const sliderDiv = document.querySelector('.memory-slider')!;
    sliderDiv.setAttribute('max', Math.trunc((80 * totalMem) / 100).toString());

    const slider = new Slider('.memory-slider', parseFloat(ram.ramMin), parseFloat(ram.ramMax));

    const minSpan = document.querySelector('.slider-touch-left span')!;
    const maxSpan = document.querySelector('.slider-touch-right span')!;

    minSpan.setAttribute('value', `${ram.ramMin} Go`);
    maxSpan.setAttribute('value', `${ram.ramMax} Go`);

    slider.on('change', (min: number, max: number) => {
      minSpan.setAttribute('value', `${min} Go`);
      maxSpan.setAttribute('value', `${max} Go`);
      this.store.upsert<RAM>(ItemKey.Ram, {
        ramMax: max.toString(),
        ramMin: min.toString(),
      });
    });
  }

  private async initResolution() {
    const resolution = this.store.get<Resolution>(ItemKey.Resolution) || {
      width: '1280',
      height: '720',
    };

    const width = document.querySelector('.width-size') as HTMLInputElement;
    const height = document.querySelector('.height-size') as HTMLInputElement;
    width.value = resolution.width;
    height.value = resolution.height;

    const select = document.getElementById('select') as HTMLSelectElement;
    select.addEventListener('change', (event) => {
      const resolution = select.options[select.options.selectedIndex].value.split(' x ');
      select.options.selectedIndex = 0;

      width.value = resolution[0];
      height.value = resolution[1];
      this.store.upsert<Resolution>(ItemKey.Resolution, {
        width: resolution[0],
        height: resolution[1],
      });
    });
  }

  private async initLauncherSettings() {
    const launcher = this.store.get<LauncherSettings>(ItemKey.LauncherSettings) ?? {
      close: 'close-launcher',
    };

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
      this.store.upsert<LauncherSettings>(ItemKey.LauncherSettings, { close: 'close-launcher' });
    });

    closeAll.addEventListener('change', () => {
      if (closeAll.checked) {
        closeLauncher.checked = false;
        openLauncher.checked = false;
      }
      if (!closeAll.checked) closeAll.checked = true;
      launcher.close = 'close-all';
      this.store.upsert<LauncherSettings>(ItemKey.LauncherSettings, { close: 'close-all' });
    });

    openLauncher.addEventListener('change', () => {
      if (openLauncher.checked) {
        closeLauncher.checked = false;
        closeAll.checked = false;
      }
      if (!openLauncher.checked) openLauncher.checked = true;
      launcher.close = 'open-launcher';
      this.store.upsert<LauncherSettings>(ItemKey.LauncherSettings, { close: 'open-launcher' });
    });
  }

  private initTab() {
    document.querySelector('.home-panel-settings')!.addEventListener('click', () => {
      changePanel('home');
    });
  }
}
