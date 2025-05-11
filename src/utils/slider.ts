type SliderEventCallback = (minValue: number, maxValue: number) => void;

class Slider {
    private slider: HTMLElement;
    private touchLeft: HTMLElement;
    private touchRight: HTMLElement;
    private lineSpan: HTMLElement;
    private min: number;
    private max: number;
    private step: number;
    private normalizeFact: number;
    private maxX: number;
    private selectedTouch: HTMLElement | null;
    private startX: number;
    private x: number;
    private initialValue: number;

    private func: { [key: string]: SliderEventCallback };

    constructor(id: string, minValue: number = 0, maxValue: number = 100) {
        this.slider = document.querySelector(id) as HTMLElement;
        this.touchLeft = this.slider.querySelector(".slider-touch-left") as HTMLElement;
        this.touchRight = this.slider.querySelector(".slider-touch-right") as HTMLElement;
        this.lineSpan = this.slider.querySelector(".slider-line span") as HTMLElement;

        this.min = parseFloat(this.slider.getAttribute("min") || `${minValue}`);
        this.max = parseFloat(this.slider.getAttribute("max") || `${maxValue}`);
        this.step = parseFloat(this.slider.getAttribute("step") || "1");
        this.normalizeFact = 18;
        this.selectedTouch = null;
        this.startX = 0;
        this.x = 0;

        this.maxX = this.slider.offsetWidth - this.touchRight.offsetWidth;
        this.initialValue = this.lineSpan.offsetWidth - this.normalizeFact;

        this.reset();
        this.setMinValue(minValue);
        this.setMaxValue(maxValue);

        this.func = {};

        this.attachEvents();
    }

    private reset() {
        this.touchLeft.style.left = "0px";
        this.touchRight.style.left = `${this.slider.offsetWidth - this.touchLeft.offsetWidth}px`;
        this.lineSpan.style.marginLeft = "0px";
        this.lineSpan.style.width = `${this.slider.offsetWidth - this.touchLeft.offsetWidth}px`;
        this.startX = 0;
        this.x = 0;
    }

    private setMinValue(minValue: number) {
        const ratio = (minValue - this.min) / (this.max - this.min);
        this.touchLeft.style.left = `${Math.ceil(ratio * (this.slider.offsetWidth - (this.touchLeft.offsetWidth + this.normalizeFact)))}px`;
        this.lineSpan.style.marginLeft = `${this.touchLeft.offsetLeft}px`;
        this.lineSpan.style.width = `${this.touchRight.offsetLeft - this.touchLeft.offsetLeft}px`;
    }

    private setMaxValue(maxValue: number) {
        const ratio = (maxValue - this.min) / (this.max - this.min);
        this.touchRight.style.left = `${Math.ceil(ratio * (this.slider.offsetWidth - (this.touchLeft.offsetWidth + this.normalizeFact)) + this.normalizeFact)}px`;
        this.lineSpan.style.marginLeft = `${this.touchLeft.offsetLeft}px`;
        this.lineSpan.style.width = `${this.touchRight.offsetLeft - this.touchLeft.offsetLeft}px`;
    }

    private onStart(elem: HTMLElement, event: MouseEvent | TouchEvent) {
        event.preventDefault();

        this.selectedTouch = elem;
        this.startX = (event as MouseEvent).pageX - (this.selectedTouch?.offsetLeft || 0);
        document.addEventListener("mousemove", this.onMove);
        document.addEventListener("mouseup", this.onStop);
        document.addEventListener("touchmove", this.onMove);
        document.addEventListener("touchend", this.onStop);
    }

    private onMove = (event: MouseEvent | TouchEvent) => {
        this.x = (event as MouseEvent).pageX - this.startX;

        if (this.selectedTouch === this.touchLeft) {
            if (this.x > this.touchRight.offsetLeft - this.selectedTouch.offsetWidth - 24) {
                this.x = this.touchRight.offsetLeft - this.selectedTouch.offsetWidth - 24;
            } else if (this.x < 0) this.x = 0;

            this.selectedTouch.style.left = `${this.x}px`;
        } else if (this.selectedTouch === this.touchRight) {
            if (this.x < this.touchLeft.offsetLeft + this.touchLeft.offsetWidth + 24) {
                this.x = this.touchLeft.offsetLeft + this.touchLeft.offsetWidth + 24;
            } else if (this.x > this.maxX) this.x = this.maxX;

            this.selectedTouch.style.left = `${this.x}px`;
        }

        this.lineSpan.style.marginLeft = `${this.touchLeft.offsetLeft}px`;
        this.lineSpan.style.width = `${this.touchRight.offsetLeft - this.touchLeft.offsetLeft}px`;

        this.calculateValue();
    };

    private onStop = (event: MouseEvent | TouchEvent) => {
        document.removeEventListener("mousemove", this.onMove);
        document.removeEventListener("mouseup", this.onStop);
        document.removeEventListener("touchmove", this.onMove);
        document.removeEventListener("touchend", this.onStop);

        this.selectedTouch = null;
        this.calculateValue();
    };

    private calculateValue() {
        const newValue = (this.lineSpan.offsetWidth - this.normalizeFact) / this.initialValue;
        let minValue = this.lineSpan.offsetLeft / this.initialValue;
        let maxValue = minValue + newValue;

        minValue = minValue * (this.max - this.min) + this.min;
        maxValue = maxValue * (this.max - this.min) + this.min;

        if (this.step !== 0.0) {
            const multiMin = Math.floor(minValue / this.step);
            const multiMax = Math.floor(maxValue / this.step);
            this.min = this.step * multiMin;
            this.max = this.step * multiMax;
        }

        this.emit("change", this.min, this.max);
    }

    on(name: string, func: SliderEventCallback) {
        this.func[name] = func;
    }

    private emit(name: string, ...args: any[]) {
        if (this.func[name]) {
            // @ts-ignore
            this.func[name](...args);
        }
    }

    private attachEvents() {
        this.touchLeft.addEventListener("mousedown", (event) => this.onStart(this.touchLeft, event));
        this.touchRight.addEventListener("mousedown", (event) => this.onStart(this.touchRight, event));

        this.touchLeft.addEventListener("touchstart", (event) => this.onStart(this.touchLeft, event));
        this.touchRight.addEventListener("touchstart", (event) => this.onStart(this.touchRight, event));
    }
}

export default Slider;