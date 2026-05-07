import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline, Transform } from 'stream';
import { promisify } from 'util';
import EventEmitter from 'node:events';
import os from 'node:os';
import { StoreItem, Store } from '../../utils/store';
import { UnusedFilesCleaner } from './unused-files.cleaner';

const streamPipeline = promisify(pipeline);

const IGNORE_LIST = [
  'assets',
  'java',
  'libraries',
  'logs',
  'natives',
  'resourcepacks',
  'saves',
  'settings',
  'shaderpacks',
  'crash-reports',
  'minecraft.enc',
  'wrapper.jar',
  'options.txt',
  'optionsof.txt',
];

type DownloadableFile = {
  path: string;
  size: number;
  hash: string;
  url: string;
};

export class MineriaClientDownloader {
  constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly store: Store,
  ) {}

  public async install(): Promise<void> {
    const downloadableFiles = await this.fetchDownloadableFiles();
    if (!downloadableFiles) return;

    const totalSize = MineriaClientDownloader.calculateTotalSize(downloadableFiles);
    let verifiedBytes = 0;
    let downloadedBytes = 0;

    const downloadQueue: { file: DownloadableFile; fullPath: string }[] = [];

    const filesToDownload = downloadableFiles.map(async (file) => {
      const fullPath = path.join(MineriaClientDownloader.getClientPath(), file.path);
      const needsDownload = await this.shouldDownloadFile(fullPath, file.hash);

      if (!needsDownload) {
        verifiedBytes += file.size;
        return;
      }

      downloadQueue.push({ file, fullPath });
    });

    await Promise.all(filesToDownload);

    console.log(`${downloadQueue.length} new files to download`);

    for (const { file, fullPath } of downloadQueue) {
      await this.downloadAndStoreFile(file, fullPath, (chunkSize) => {
        downloadedBytes += chunkSize;
        const totalProgress = verifiedBytes + downloadedBytes;
        this.eventEmitter.emit('client_download_progress', totalProgress, totalSize);
      });
    }

    await this.cleanupUnusedFiles(downloadableFiles);
    this.eventEmitter.emit('client_downloaded');
  }

  static getClientPath(): string {
    if (process.env.NODE_ENV === 'dev') {
      return path.join(__dirname, '..', '..', '..', 'client');
    }

    const homeDir = os.homedir();

    switch (process.platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', '.mineria');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'mineria');
      default:
        return path.join(homeDir, '.mineria');
    }
  }

  private static calculateTotalSize(files: DownloadableFile[]): number {
    return files.reduce((acc, file) => acc + file.size, 0);
  }

  private async cleanupUnusedFiles(files: DownloadableFile[]): Promise<void> {
    const config = this.store.get(StoreItem.MineriaConfig);
    const ignoreList = new Set((config?.ignored ?? []).concat(IGNORE_LIST));
    await new UnusedFilesCleaner(ignoreList).deleteUnusedFiles(files);
  }

  private async fetchDownloadableFiles(): Promise<DownloadableFile[]> {
    try {
      const response = await fetch('https://launcher.mineria.ovh/launcher/downloads/');
      if (!response.ok) throw new Error(`Failed to fetch file list: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  private async shouldDownloadFile(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      const exists = fs.existsSync(filePath);
      if (!exists) return true;

      const actualHash = await this.computeFileHash(filePath);
      return actualHash !== expectedHash;
    } catch (error) {
      console.error(error);
      return true;
    }
  }

  private async computeFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fsAsync.readFile(filePath);
    return createHash('sha1').update(fileBuffer).digest('hex');
  }

  private async downloadAndStoreFile(
    file: DownloadableFile,
    destination: string,
    onChunkDownloaded: (chunkSize: number) => void,
  ): Promise<void> {
    try {
      await fsAsync.mkdir(path.dirname(destination), { recursive: true });

      const response = await fetch(file.url);
      if (!response.ok || !response.body) {
        console.error(`Failed to download: ${file.url}`);
        return;
      }

      const tempPath = destination + '.tmp';
      const fileStream = fs.createWriteStream(tempPath);
      const startTime = Date.now();

      const progressStream = this.createProgressStream(startTime, onChunkDownloaded);

      await streamPipeline(response.body, progressStream, fileStream);

      if (fs.existsSync(destination)) {
        await fsAsync.rm(destination);
      }

      await fsAsync.rename(tempPath, destination);
    } catch (error) {
      const tempPath = destination + '.tmp';

      if (fs.existsSync(tempPath)) {
        await fsAsync.rm(tempPath);
      }

      await this.downloadAndStoreFile(file, destination, onChunkDownloaded);
    }
  }

  private createProgressStream(
    startTime: number,
    onChunkDownloaded: (chunkSize: number) => void,
  ): Transform {
    let downloaded = 0;

    return new Transform({
      transform: (chunk, _encoding, callback) => {
        downloaded += chunk.length;
        onChunkDownloaded(chunk.length);

        const safeElapsed = Math.max((Date.now() - startTime) / 1000, 0.5);
        const bytesPerSecond = downloaded / safeElapsed;

        const speedMbps = (bytesPerSecond * 8) / 1_000_000;

        this.eventEmitter.emit('speed', speedMbps);

        callback(null, chunk);
      },
    });
  }
}
