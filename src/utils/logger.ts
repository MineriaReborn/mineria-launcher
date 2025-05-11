export default class Logger {
    private originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
    };

    constructor(name: string, color = "#03A9F4") {
        this.override(name, color);
    }

    override(name: string, color: string) {
        const prefix = `%c[${name}]`;
        const style = `color: ${color};`;

        this.originalConsole.log = console.log;
        console.log = (...args) => this.originalConsole.log(prefix, style, ...args);

        this.originalConsole.info = console.info;
        console.info = (...args) => this.originalConsole.info(prefix, style, ...args);

        this.originalConsole.warn = console.warn;
        console.warn = (...args) => this.originalConsole.warn(prefix, style, ...args);

        this.originalConsole.error = console.error;
        console.error = (...args) => this.originalConsole.error(prefix, style, ...args);

        this.originalConsole.debug = console.debug;
        console.debug = (...args) => this.originalConsole.debug(prefix, style, ...args);
    }
}