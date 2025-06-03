import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import EventEmitter from 'node:events';
import { JavaDownloader } from './java-downloader';
import { Resolution } from '../../types/resolution';
import { Account } from '../../types/account';
import { Memory } from '../../types/memory';
import { LauncherSettings } from '../../types/launcher-settings';

interface RunnerOptions {
  clientPath: string;
  account: Account;
  memory: Memory;
  resolution: Resolution;
  launcherSettings: LauncherSettings;
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
    const memory = this.options.memory;
    const resolution = this.options.resolution;
    const launcherSettings = this.options.launcherSettings;

    const args = this.buildJavaArguments(
      classpath,
      nativesPath,
      assetsPath,
      gameDir,
      resolution,
      memory,
    );

    await this.javaDownloader.installJavaIfNotPresent();

    const childProcess = spawn(this.javaPath, args, {
      cwd: gameDir,
      detached: launcherSettings.close === 'close-launcher',
      env: {
        SHIM_MCCOMPAT: '0x800000001',
        GPU_MAX_HEAP_SIZE: '100',
        GPU_USE_SYNC_OBJECTS: '1',
        __GL_THREADED_OPTIMIZATIONS: '1',
      },
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

    libFiles.push(this.resolveRelativePath('wrapper.jar'));

    // Classpath separator is ':' on UNIX, ';' on Windows
    const separator = os.platform() === 'win32' ? ';' : ':';
    return libFiles.join(separator);
  }

  private buildJavaArguments(
    classpath: string,
    nativesPath: string,
    assetsPath: string,
    gameDir: string,
    resolution: Resolution,
    memory: Memory,
  ): string[] {
    return [
      `-Xms${memory.min * 1024}M`,
      `-Xmx${memory.max * 1024}M`,
      `-XX:ReservedCodeCacheSize=512m`,
      `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesPath}`,
      `-Djava.library.path=${nativesPath}`,
      '-cp',
      classpath,
      'fr.mineria.wrapper.Main',
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
      '--width',
      resolution.width.toString(),
      '--height',
      resolution.height.toString(),
    ];
  }

  private attachProcessListeners(childProcess: ChildProcessWithoutNullStreams): void {
    childProcess.stdout.on('data', (data) => {
      if (process.env.NODE_ENV === 'dev') {
        console.log('stdout', data.toString('utf-8'));
      }
    });

    childProcess.stderr.on('data', (data) => {
      if (process.env.NODE_ENV === 'dev') {
        console.log('stderr', data.toString('utf-8'));
      }
    });

    childProcess.on('exit', () => {
      this.eventEmitter.emit('close');
    });
  }

  private resolveRelativePath(relativePath: string): string {
    return path.resolve(this.options.clientPath, relativePath);
  }
}
