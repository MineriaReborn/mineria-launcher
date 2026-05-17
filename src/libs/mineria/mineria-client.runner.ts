import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';
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
    const gameDir = this.options.clientPath;
    const classpath = this.getLibrariesPaths();
    const memory = this.options.memory;
    const resolution = this.options.resolution;
    const launcherSettings = this.options.launcherSettings;

    const args = this.buildJavaArguments(classpath, gameDir, resolution, memory);

    await this.javaDownloader.installJavaIfNotPresent();

    const platform = os.platform();
    const isLinux = platform === 'linux';
    const isWindows = platform === 'win32';

    const extraEnv: NodeJS.ProcessEnv = {};

    if (isLinux) {
      Object.assign(extraEnv, {
        __NV_PRIME_RENDER_OFFLOAD: '1',
        __GLX_VENDOR_LIBRARY_NAME: 'nvidia',
        __GL_THREADED_OPTIMIZATIONS: '1',
        __GL_SHADER_CACHE: '1',
        __GL_SHADER_CACHE_SIZE: '100',
        __GL_MaxFramesAllowed: '1',
        __GL_SYNC_TO_VBLANK: '0',
        __GL_GSYNC_ALLOWED: '0',
        MESA_GLTHREAD: 'true',
        mesa_glthread: 'true',
      });
    }

    if (isWindows) {
      Object.assign(extraEnv, {
        SHIM_MCCOMPAT: '0x800000001',
      });
    }

    const childProcess = spawn(this.javaPath, args, {
      cwd: gameDir,
      detached: launcherSettings.close === 'close-launcher',
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    this.attachProcessListeners(childProcess);
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
    gameDir: string,
    resolution: Resolution,
    memory: Memory,
  ): string[] {
    const platform = os.platform();
    const launcherVersion = `${process.env.APP_VERSION ?? 'unknown'}-${this.getPlatform()}`;

    return [
      ...(platform === 'darwin' ? ['-XstartOnFirstThread'] : []),
      ...(platform === 'win32'
        ? ['-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump']
        : []),
      `-Xms${memory.min * 1024}M`,
      `-Xmx${memory.max * 1024}M`,
      '-XX:+UseZGC',
      '-XX:+AlwaysPreTouch',
      '-XX:+UseStringDeduplication',
      '--enable-native-access=ALL-UNNAMED',
      '--sun-misc-unsafe-memory-access=allow',
      '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
      '--add-opens', 'java.base/java.lang.reflect=ALL-UNNAMED',
      '--add-opens', 'java.base/java.io=ALL-UNNAMED',
      '--add-opens', 'java.base/java.nio=ALL-UNNAMED',
      '--add-opens', 'java.base/java.util=ALL-UNNAMED',
      '--add-opens', 'java.base/java.util.concurrent=ALL-UNNAMED',
      '--add-opens', 'java.base/sun.nio.ch=ALL-UNNAMED',
      '-cp',
      classpath,
      'fr.mineria.wrapper.Main',
      '--username',
      this.options.account.username,
      '--gameDir',
      gameDir,
      '--launcherVersion',
      launcherVersion,
      '--uuid',
      this.options.account.uuid,
      '--accessToken',
      this.options.account.access_token,
      '--width',
      resolution.width.toString(),
      '--height',
      resolution.height.toString(),
    ];
  }

  private getPlatform(): string {
    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'win32') return arch === 'x64' ? 'win64' : 'win32';
    if (platform === 'darwin') return arch === 'arm64' ? 'macos-arm64' : 'macos-x64';
    if (arch === 'arm64') return 'linux-arm64';
    if (arch === 'arm') return 'linux-arm32';
    return arch === 'x64' ? 'linux64' : 'linux32';
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
      this.eventEmitter.emit('game_closed');
    });
  }

  private resolveRelativePath(relativePath: string): string {
    return path.resolve(this.options.clientPath, relativePath);
  }
}
