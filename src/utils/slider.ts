import EventEmitter from 'node:events';

export class Slider extends EventEmitter {
  el: HTMLElement;
  minValue: number;
  maxValue: number;
  step: number;

  line: HTMLElement;
  touchLeft: HTMLDivElement;
  touchRight: HTMLDivElement;

  private dragging?: 'left' | 'right';

  constructor(selector: string, min: number, max: number) {
    super();

    this.el = document.querySelector(selector) as HTMLElement;
    if (!this.el) throw new Error(`Slider not found: ${selector}`);

    this.minValue = min;
    this.maxValue = max;

    this.step = parseFloat(this.el.getAttribute('step') ?? '1');

    this.line = this.el.querySelector('.slider-line span') as HTMLElement;
    this.touchLeft = this.el.querySelector('.slider-touch-left') as HTMLDivElement;
    this.touchRight = this.el.querySelector('.slider-touch-right') as HTMLDivElement;

    this.bindEvents();
    this.reset();
  }

  reset() {
    this.setMinValue(this.minValue);
    this.setMaxValue(this.maxValue);
  }

  setMinValue(value: number) {
    this.minValue = this.clamp(value);
    const percent = this.valueToPercent(this.minValue);
    this.touchLeft.style.left = `${percent}%`;

    const label = this.touchLeft.querySelector('span');
    if (label) label.setAttribute('value', `${this.minValue} Go`);

    this.updateRange();
    this.emit('change', this.minValue, this.maxValue);
  }

  setMaxValue(value: number) {
    this.maxValue = this.clamp(value);
    const percent = this.valueToPercent(this.maxValue);
    this.touchRight.style.left = `${percent}%`;

    const label = this.touchRight.querySelector('span');
    if (label) label.setAttribute('value', `${this.maxValue} Go`);

    this.updateRange();
    this.emit('change', this.minValue, this.maxValue);
  }

  private bindEvents() {
    const startDrag = (target: 'left' | 'right') => (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.dragging = target;
      window.addEventListener('mousemove', this.onDrag);
      window.addEventListener('mouseup', this.onStopDrag);
      window.addEventListener('touchmove', this.onDrag);
      window.addEventListener('touchend', this.onStopDrag);
    };

    this.touchLeft.addEventListener('mousedown', startDrag('left'));
    this.touchLeft.addEventListener('touchstart', startDrag('left'));

    this.touchRight.addEventListener('mousedown', startDrag('right'));
    this.touchRight.addEventListener('touchstart', startDrag('right'));
  }

  private onDrag = (e: MouseEvent | TouchEvent) => {
    if (!this.dragging) return;

    const rect = this.el.getBoundingClientRect();
    const clientX = e instanceof TouchEvent ? e.touches[0].clientX : e.clientX;
    const percent = ((clientX - rect.left) / rect.width) * 100;
    const value = this.percentToValue(percent);

    if (this.dragging === 'left') {
      this.setMinValue(Math.min(value, this.maxValue - this.step));
    } else if (this.dragging === 'right') {
      this.setMaxValue(Math.max(value, this.minValue + this.step));
    }
  };

  private onStopDrag = () => {
    this.dragging = undefined;
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('mouseup', this.onStopDrag);
    window.removeEventListener('touchmove', this.onDrag);
    window.removeEventListener('touchend', this.onStopDrag);
  };

  private clamp(value: number): number {
    const min = parseFloat(this.el.getAttribute('min') ?? '0');
    const max = parseFloat(this.el.getAttribute('max') ?? '1');
    const stepped = Math.round(value / this.step) * this.step;
    return Math.max(min, Math.min(max, stepped));
  }

  private valueToPercent(value: number): number {
    const min = parseFloat(this.el.getAttribute('min') ?? '0');
    const max = parseFloat(this.el.getAttribute('max') ?? '1');
    return ((value - min) / (max - min)) * 100;
  }

  private percentToValue(percent: number): number {
    const min = parseFloat(this.el.getAttribute('min') ?? '0');
    const max = parseFloat(this.el.getAttribute('max') ?? '1');
    const raw = min + (percent / 100) * (max - min);
    return this.clamp(raw);
  }

  private updateRange() {
    const leftPercent = this.valueToPercent(this.minValue);
    const rightPercent = this.valueToPercent(this.maxValue);
    const start = Math.min(leftPercent, rightPercent);
    const end = Math.max(leftPercent, rightPercent);

    this.line.style.left = `${start}%`;
    this.line.style.width = `${end - start}%`;
  }
}
