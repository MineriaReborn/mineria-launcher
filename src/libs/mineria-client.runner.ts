import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

export class MineriaClientRunner {

  constructor(
    private readonly options: {
      rootDir: string;
      account: {
        access_token: string;
        uuid: string;
      };
      java: {
        path: string
      };
    }
  ) {}


  run() {
    let java: any = this.options.java.path;
    let logs = this.options.rootDir;


    const platform = os.platform();
    const arch = os.arch();

    let nativesPath: string;
    if(platform === 'win32') {
      nativesPath = path.join(__dirname, `../../client/natives/`)
    } else if (platform === 'darwin' && arch === 'arm64') {
      nativesPath = path.join(__dirname, `../../client/natives/osx/arm64`)
    } else if (platform === 'darwin' && arch === 'x64') {
      nativesPath = path.join(__dirname, `../../client/natives/osx`)
    }

    const assetsPath = path.join(__dirname, `../../client/assets/`)
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
      path.join(__dirname, `../../client`),
      "--assetsDir",
      assetsPath,
      "--assetIndex",
      "1.7.10",
      "--uuid",
      this.options.account.uuid,
      "--accessToken",
      this.options.account.access_token,
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
    childProcess.stderr.on('data', (data: any) => {
      console.log("stderr ", data.toString('utf-8'));
    });
    childProcess.stdout.on('data', (data: any) => {
      console.log("stdout ", data.toString('utf-8'));
    });
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