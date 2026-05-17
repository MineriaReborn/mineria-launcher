import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createGunzip } from 'node:zlib';
import { pipeline, Transform } from 'node:stream';
import { promisify } from 'node:util';
import * as tar from 'tar';
import unzipper from 'unzipper';
import EventEmitter from 'node:events';

const streamPipeline = promisify(pipeline);

export class JavaDownloader {
  constructor(
    private readonly clientPath: string,
    private readonly eventEmitter: EventEmitter,
  ) {}

  public async installJavaIfNotPresent(): Promise<void> {
    const javaFolder = path.join(this.clientPath, 'java');

    if (fs.existsSync(javaFolder)) {
      const contents = fs.readdirSync(javaFolder);
      const isClean = contents.length === 0 || (contents.length === 1 && contents[0] === 'java25');

      if (!isClean) {
        console.log(`[java] Inconsistent state in ${javaFolder} (${contents.join(', ')}), wiping`);
        fs.rmSync(javaFolder, { recursive: true, force: true });
      }
    }

    if (fs.existsSync(this.getJavaBinaryPath())) {
      console.log(`✔ Java 25 detected at ${this.getJavaBinaryPath()}`);
      return;
    }

    this.eventEmitter.emit('java_download_progress');
    await this.install();
  }

  public getJavaBinaryPath(): string {
    const platform = os.platform();

    if (platform === 'darwin') {
      return path.join(this.clientPath, 'java', 'java25', 'Contents', 'Home', 'bin', 'java');
    }

    if (platform === 'win32') {
      return path.join(this.clientPath, 'java', 'java25', 'bin', 'javaw.exe');
    }

    return path.join(this.clientPath, 'java', 'java25', 'bin', 'java');
  }

  private async install(): Promise<void> {
    const url = this.getDownloadUrl();
    const archivePath = await this.downloadArchive(url);
    await this.extractArchive(archivePath);
    console.log('✅ Temurin 25 installation complete.');
  }

  private getDownloadUrl(): string {
    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'darwin') {
      const adoptiumArch = arch === 'arm64' ? 'aarch64' : 'x64';
      return `https://api.adoptium.net/v3/binary/latest/25/ga/mac/${adoptiumArch}/jdk/hotspot/normal/eclipse`;
    }

    if (platform === 'win32') {
      return 'https://api.adoptium.net/v3/binary/latest/25/ga/windows/x64/jdk/hotspot/normal/eclipse';
    }

    if (platform === 'linux') {
      const adoptiumArch = arch === 'arm64' ? 'aarch64' : 'x64';
      return `https://api.adoptium.net/v3/binary/latest/25/ga/linux/${adoptiumArch}/jdk/hotspot/normal/eclipse`;
    }

    throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);
  }

  private isZipFormat(): boolean {
    return os.platform() === 'win32';
  }

  private async downloadArchive(url: string): Promise<string> {
    const ext = this.isZipFormat() ? 'zip' : 'tar.gz';
    const dest = path.join(os.tmpdir(), `temurin-25.${ext}`);

    console.log(`⬇ Downloading ${url}...`);
    const res = await fetch(url);

    if (!res.ok || !res.body) {
      throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }

    const totalSize = Number(res.headers.get('content-length') ?? 0);
    let downloaded = 0;

    const progressStream = new Transform({
      transform: (chunk, _encoding, callback) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          this.eventEmitter.emit('java_download_progress', downloaded, totalSize);
        }
        callback(null, chunk);
      },
    });

    await streamPipeline(res.body, progressStream, fs.createWriteStream(dest));

    const { size } = fs.statSync(dest);
    if (size === 0) {
      throw new Error('Downloaded file is empty');
    }

    return dest;
  }

  private async extractArchive(archivePath: string): Promise<void> {
    const javaRootFolder = path.join(this.clientPath, 'java');

    if (fs.existsSync(javaRootFolder)) {
      fs.rmSync(javaRootFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(javaRootFolder, { recursive: true });

    console.log(`📦 Extracting Java 25 to: ${javaRootFolder}...`);

    if (this.isZipFormat()) {
      await streamPipeline(
        fs.createReadStream(archivePath),
        unzipper.Extract({ path: javaRootFolder }),
      );
    } else {
      await streamPipeline(
        fs.createReadStream(archivePath),
        createGunzip(),
        tar.x({ cwd: javaRootFolder }),
      );
    }

    const contents = fs.readdirSync(javaRootFolder);
    const firstDir = contents.find((name) =>
      fs.statSync(path.join(javaRootFolder, name)).isDirectory(),
    );

    if (!firstDir) {
      throw new Error('No folder found after extraction');
    }

    const originalPath = path.join(javaRootFolder, firstDir);
    const newPath = path.join(javaRootFolder, 'java25');

    for (let i = 0; i < 10; i++) {
      try {
        fs.renameSync(originalPath, newPath);
        break;
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'ENOTEMPTY') throw err;
        if (i === 9) throw err;
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }

    console.log(`✅ Extracted and renamed to: ${newPath}`);
  }
}
