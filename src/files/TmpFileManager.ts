import Fs from 'node:fs';
import Path from 'node:path';
import Os from 'os';
import { singleton } from 'tsyringe';
import { getAppInfo } from '../constants';

export type TmpDir = {
  readonly path: string;
  readonly cleanup: () => Promise<void>;
}

@singleton()
export default class TmpFileManager {
  private tmpRootDir?: string;
  private readonly tmpDirs: TmpDir[] = [];

  async createTmpDir(): Promise<TmpDir> {
    const tmpDir = await Fs.promises.mkdtemp(Path.join(await this.getTmpRootDir(), '/'));
    const cleanup = async () => {
      this.tmpDirs.splice(this.tmpDirs.findIndex((dir) => dir.path === tmpDir), 1);
      await Fs.promises.rm(tmpDir, { recursive: true, force: true });
    };

    this.tmpDirs.push({ path: tmpDir, cleanup });
    return { path: tmpDir, cleanup };
  }

  async deleteAll(): Promise<void> {
    for (const tmpDir of this.tmpDirs) {
      await tmpDir.cleanup();
    }
  }

  private async getTmpRootDir(): Promise<string> {
    if (this.tmpRootDir == null) {
      const namePrefix = `${getAppInfo().name}-`;
      this.tmpRootDir = await Fs.promises.mkdtemp(Path.join(Os.tmpdir(), namePrefix));
    }
    return this.tmpRootDir;
  }
}
