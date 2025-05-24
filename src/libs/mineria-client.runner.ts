import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import EventEmitter from 'node:events';
import { JavaDownloader } from './java-downloader';

interface AccountOptions {
  username: string;
  access_token: string;
  uuid: string;
}

interface RunnerOptions {
  clientPath: string;
  account: AccountOptions;
}

export class MineriaClientRunner {
  private readonly javaPath: string;

  constructor(
    private readonly javaDownloader: JavaDownloader,
    private readonly eventEmitter: EventEmitter,
    private readonly options: RunnerOptions,
  ) {
    this.javaPath = this.javaDownloader.getJavaBinaryPath();
  }

  public async run(): Promise<void> {
    const nativesPath = this.getNativesPath();
    const assetsPath = this.resolveRelativePath('assets');
    const gameDir = this.options.clientPath;
    const classpath = this.getLibrariesPaths();

    const args = this.buildJavaArguments(classpath, nativesPath, assetsPath, gameDir);

    await this.javaDownloader.installJavaIfNotPresent();

    const childProcess = spawn(this.javaPath, args, {
      cwd: gameDir,
      detached: false,
    });

    this.attachProcessListeners(childProcess);
  }

  private getNativesPath(): string {
    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'win32') {
      return this.resolveRelativePath('natives');
    } else if (platform === 'darwin') {
      if (arch === 'arm64') {
        return this.resolveRelativePath('natives/osx/arm64');
      } else if (arch === 'x64') {
        return this.resolveRelativePath('natives/osx');
      }
    }

    throw new Error(`Unsupported platform/arch combination: ${platform} ${arch}`);
  }

  private getLibrariesPaths(): string {
    const libsDir = this.resolveRelativePath('libraries');
    const libFiles = fs.readdirSync(libsDir).map((lib) => path.join(libsDir, lib));

    libFiles.push(this.resolveRelativePath('minecraft.jar'));

    // Classpath separator is ':' on UNIX, ';' on Windows
    const separator = os.platform() === 'win32' ? ';' : ':';
    return libFiles.join(separator);
  }

  private buildJavaArguments(
    classpath: string,
    nativesPath: string,
    assetsPath: string,
    gameDir: string,
  ): string[] {
    return [
      '-Xms1024M',
      '-Xmx2048M',
      '-Dfml.ignoreInvalidMinecraftCertificates=true',
      `-Djna.tmpdir=${nativesPath}`,
      `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesPath}`,
      `-Dio.netty.native.workdir=${nativesPath}`,
      `-Djava.library.path=${nativesPath}`,
      '-cp',
      classpath,
      'net.minecraft.client.main.Main',
      '--username',
      this.options.account.username,
      '--version',
      '1.7.10',
      '--gameDir',
      gameDir,
      '--assetsDir',
      assetsPath,
      '--assetIndex',
      '1.7.10',
      '--uuid',
      this.options.account.uuid,
      '--accessToken',
      this.options.account.access_token,
      '--userProperties',
      '{}',
      '--userType',
      'AZauth',
      '--width',
      '1280',
      '--height',
      '720',
    ];
  }

  private attachProcessListeners(childProcess: ChildProcessWithoutNullStreams): void {
    childProcess.stdout.on('data', (data) => {
      this.eventEmitter.emit('data', data.toString('utf-8'));
    });

    childProcess.stderr.on('data', (data) => {
      this.eventEmitter.emit('data', data.toString('utf-8'));
    });
  }

  private resolveRelativePath(relativePath: string): string {
    return path.resolve(this.options.clientPath, relativePath);
  }
}
