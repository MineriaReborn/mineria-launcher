
import { EventEmitter } from 'events';

export default class MinecraftLoader {
    options: any;
    on: any;
    emit: any;
    constructor(options: any) {
        this.options = options;
        this.on = EventEmitter.prototype.on;
        this.emit = EventEmitter.prototype.emit;
    }
 

    async GetArguments(json: any, version: any) {
        if (json === null) {
            return {
                game: [],
                jvm: []
            }
        }

        let moddeArguments = json.arguments;
        if (!moddeArguments) return { game: [], jvm: [] };
        let Arguments: any = {}
        if (moddeArguments.game) Arguments.game = moddeArguments.game;
        if (moddeArguments.jvm) Arguments.jvm = moddeArguments.jvm.map(jvm => {
            return jvm
                .replace(/\${version_name}/g, version)
                .replace(/\${classpath_separator}/g, process.platform === 'win32' ? ';' : ':');
        })

        return {
            game: Arguments.game || [],
            jvm: Arguments.jvm || [],
            mainClass: json.mainClass
        };
    }
}