import path from 'node:path';
import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';
const streamPipeline = promisify(pipeline);

type DownloadableFile = {path: string; size: number; hash: string; url: string}

export class MineriaClientDownloader {
  private BASE_DIRECTORY = "./client"

  constructor() {}

  async downloadClient() {
    const files = await fetchJsonObject<DownloadableFile[]>('https://launcher.mineria.ovh/launcher/downloads/');
    if (!files) return;

    for (const file of files) {
      // empty strings in remote JSON sometimes
      if(typeof file === 'string') continue;

      const fullPath = path.join(this.BASE_DIRECTORY, file.path);
      const isFileExisting = fs.existsSync(fullPath);

      if(isFileExisting) {
        const isFileUntouched = await this.verifyFileHash(fullPath, file.hash);
        if(!isFileUntouched) continue;
      }

      await this.downloadFile(file, fullPath);
    }

    console.log('Client files downloaded')
  }

  private async verifyFileHash(filePath: string, expectedHash: string): Promise<boolean> {
    const hash = createHash('md5');
    const fileBuffer = await fsAsync.readFile(filePath);
    hash.update(fileBuffer);
    const calculated = hash.digest('hex');
    return calculated === expectedHash;
  }

  private async downloadFile(file: DownloadableFile, destination: string) {
    await fsAsync.mkdir(path.dirname(destination), { recursive: true });

    const response = await fetch(file.url);
    if (!response.ok || !response.body) {
      console.error(`Failed to download: ${file.url}`);
      return;
    }

    const tempPath = destination + '.tmp';
    const fileStream = fs.createWriteStream(tempPath);

    await streamPipeline(response.body, fileStream);

    await fsAsync.rename(tempPath, destination);
  }
}


async function fetchJsonObject<T>(url: string) {
  return await tryCatch(async () => {
    const response = await fetch(url);
    return await response.json() as T;
  }, (err: unknown) => {
    console.error(err);
  });
}


export async function tryCatch<T>(
  fn: () => Promise<T>,
  onError?: (error: unknown) => void,
  cleanupFn?: () => void | Promise<void>,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (!onError) {
      console.error('Unhandled error:', error);
      return undefined;
    }

    onError(error);
  } finally {
    await cleanupFn?.();
  }
}
