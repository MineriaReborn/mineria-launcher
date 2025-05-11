import path from 'node:path';
import fsAsync from 'node:fs/promises';
import fs from 'node:fs';
import { MineriaClientDownloader } from './mineria-client.downloader';

type DownloadableFile = {
  path: string;
  size: number;
  hash: string;
  url: string;
};

export class UnusedFilesCleaner {
  constructor(private readonly ignoreList: Set<string>) {}

  public async deleteUnusedFiles(validFiles: DownloadableFile[]): Promise<void> {
    const clientPath = MineriaClientDownloader.getClientPath();
    const validPaths = validFiles.map((file) => path.join(clientPath, file.path));

    try {
      const allFiles = await this.collectFiles(clientPath);
      for (const filePath of allFiles) {
        if (validPaths.includes(filePath)) continue;
        await fsAsync.rm(filePath);
        console.log('Deleted unused file', filePath);
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async collectFiles(dir: string): Promise<string[]> {
    if (!fs.existsSync(dir)) {
      return [];
    }

    return await this.walk(dir);
  }

  private async walk(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fsAsync.readdir(dir, { withFileTypes: true });

    const promises = entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      if (this.ignoreList.has(entry.name) || this.ignoreList.has(relativePath)) {
        return;
      }

      if (entry.isDirectory()) {
        return await this.walk(fullPath);
      }

      results.push(fullPath);
    });

    await Promise.all(promises);
    return results;
  }
}
