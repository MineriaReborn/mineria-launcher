import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

export class MineriaClientRunner {

  constructor(
    private readonly options: {
      rootDir: string;
      java: {
        path: string
      };
    }
  ) {}

  run() {
    let java: any = this.options.java.path;
    let logs = this.options.rootDir + '/logs';
    if (!fs.existsSync(logs)) fs.mkdirSync(logs, { recursive: true });

    const nativesPath = path.join(__dirname, `../../client/natives/`)
    const gameLibsPaths = fs.readdirSync('./client/libraries').map((lib) => `${path.join(__dirname, `../../client/libraries/`)}${lib}`);

    gameLibsPaths.push(`${path.join(__dirname, `../../client/`)}minecraft.jar`);

    const args: any[] = [
      "-Xms1024M",
      "-Xmx2048M",
      "-Dfml.ignoreInvalidMinecraftCertificates=true",
      `-Djna.tmpdir=${nativesPath}`,
      `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesPath}`,
      `-Dio.netty.native.workdir=${nativesPath}`,
      `-Djava.library.path=${nativesPath}`,
      "-cp",
      gameLibsPaths.join(':'),
      "net.minecraft.client.main.Main",
      "--username",
      "Xylah",
      "--version",
      "1.7.10",
      "--gameDir",
      "./client",
      "--assetsDir",
      "./client/assets",
      "--assetIndex",
      "1.7.10",
      "--uuid",
      'this.options.uuid',
      "--accessToken",
      'this.options.accessToken',
      "--userProperties",
      "{}",
      "--userType",
      "AZauth",
      "--width",
      1280,
      "--height",
      720
    ];

    const childProcess = spawn(java, args, { cwd: logs, detached: false });
    childProcess.on('close', (code, signal) => {
      console.log('closed', code, signal)
    })
    childProcess.on('disconnect', (code) => {
      console.log('disconnected ', code)
    });
    childProcess.on('exit', (code) => {
      console.log('exited ', code)
    });
    childProcess.on('message', (msg) => {
      console.log('message ', msg?.toString())
    });
    childProcess.on('spawn', (code) => {
      console.log('spawned ', code)
    });
    childProcess.on("error", (error) => {
      console.error(error);
    });
  }
}