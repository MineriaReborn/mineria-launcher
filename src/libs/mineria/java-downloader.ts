import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import * as tar from 'tar';
import unzipper from 'unzipper';

const streamPipeline = promisify(pipeline);

export class JavaDownloader {
  constructor(private readonly clientPath: string) {}

  public async installJavaIfNotPresent(): Promise<void> {
    if (fs.existsSync(this.getJavaBinaryPath())) {
      console.log(`✔ Java 8 detected at ${this.getJavaBinaryPath()}`);
      return;
    }

    await this.install();
  }

  public getJavaBinaryPath(): string {
    const platform = os.platform();

    if (platform === 'darwin') {
      return path.join(this.clientPath, 'java', 'java8', 'Contents', 'Home', 'bin', 'java');
    }

    if (platform === 'win32') {
      return path.join(this.clientPath, 'java', 'java8', 'bin', 'javaw.exe');
    }

    return path.join(this.clientPath, 'java', 'java8', 'bin', 'java');
  }

  private async install(): Promise<void> {
    const url = this.getDownloadUrl();
    const archivePath = await this.downloadArchive(url);
    await this.extractArchive(archivePath, url);
    console.log('✅ Corretto 8 installation complete.');
  }

  private getDownloadUrl(): string {
    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'darwin') {
      return arch === 'arm64'
        ? 'https://corretto.aws/downloads/latest/amazon-corretto-8-aarch64-macos-jdk.tar.gz'
        : 'https://corretto.aws/downloads/latest/amazon-corretto-8-x64-macos-jdk.tar.gz';
    }

    if (platform === 'win32') {
      return arch === 'x64'
        ? 'https://corretto.aws/downloads/latest/amazon-corretto-8-x64-windows-jre.zip'
        : 'https://corretto.aws/downloads/latest/amazon-corretto-8-x86-windows-jre.zip';
    }

    if (platform === 'linux') {
      return arch === 'arm64'
        ? 'https://corretto.aws/downloads/latest/amazon-corretto-8-aarch64-linux-jdk.tar.gz'
        : 'https://corretto.aws/downloads/latest/amazon-corretto-8-x64-linux-jdk.tar.gz';
    }

    throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);
  }

  private async downloadArchive(url: string): Promise<string> {
    const dest = path.join(os.tmpdir(), path.basename(url));

    console.log(`⬇ Downloading ${url}...`);
    const res = await fetch(url);

    if (!res.ok || !res.body) {
      throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }

    await streamPipeline(res.body, fs.createWriteStream(dest));

    const { size } = fs.statSync(dest);
    if (size === 0) {
      throw new Error('Downloaded file is empty');
    }

    return dest;
  }

  private async extractArchive(archivePath: string, url: string): Promise<void> {
    const javaRootFolder = path.join(this.clientPath, 'java');
    if (!fs.existsSync(javaRootFolder)) {
      fs.mkdirSync(javaRootFolder, { recursive: true });
    }

    console.log(`📦 Extracting Java 8 to: ${javaRootFolder}...`);

    if (url.endsWith('.zip')) {
      await streamPipeline(
        fs.createReadStream(archivePath),
        unzipper.Extract({ path: javaRootFolder }),
      );
    } else if (url.endsWith('.tar.gz')) {
      await streamPipeline(
        fs.createReadStream(archivePath),
        createGunzip(),
        tar.x({ cwd: javaRootFolder }),
      );
    } else {
      throw new Error('Unsupported archive format');
    }

    const contents = fs.readdirSync(javaRootFolder);
    const firstDir = contents.find((name) =>
      fs.statSync(path.join(javaRootFolder, name)).isDirectory(),
    );

    if (!firstDir) {
      throw new Error('No folder found after extraction');
    }

    const originalPath = path.join(javaRootFolder, firstDir);
    const newPath = path.join(javaRootFolder, 'java8');

    fs.renameSync(originalPath, newPath);

    console.log(`✅ Extracted and renamed to: ${newPath}`);
  }
}
