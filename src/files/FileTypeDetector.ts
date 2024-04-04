import * as MimeType from 'mime-types';
import ChildProcess from 'node:child_process';
import Os from 'os';
import { singleton } from 'tsyringe';

@singleton()
export default class FileTypeDetector {
  private readonly useFileApp: boolean;

  constructor() {
    this.useFileApp = FileTypeDetector.isFileAppAvailable();
  }

  async getMimeType(fileName: string, fileContent: Buffer): Promise<string | null> {
    let fileMimeType: string | null = null;

    if (this.useFileApp) {
      try {
        fileMimeType = await this.getMimeTypeFromFileApp(fileContent);
      } catch (err) {
        console.error(err);
      }
    }

    if (fileMimeType == null ||
      fileMimeType == 'inode/x-empty' ||
      (fileMimeType == 'application/octet-stream' && fileName.toLowerCase().endsWith('.mp3'))) {
      const lookUpByExtension = MimeType.lookup(fileName);

      if (lookUpByExtension) {
        fileMimeType = lookUpByExtension;
      }
    }

    if (fileMimeType == 'inode/x-empty') {
      return 'text/plain';
    }

    return fileMimeType;
  }

  private async getMimeTypeFromFileApp(data: Buffer): Promise<string | null> {
    const childProcessArgs = ['--mime-type', '--preserve-date', '--separator=', '-E', '--raw', '--print0', '-'];

    const fileProcess = await this.runFileApp(childProcessArgs, data);
    const args = fileProcess.stdout.split('\0');

    if (args.length !== 2) {
      throw new Error(`Invalid output from 'file': ${JSON.stringify({
        stdout: fileProcess.stdout,
        stderr: fileProcess.stderr,
        args,
        childProcessArgs
      })}`);
    }

    return args[1].trim() || null;
  }

  async runFileApp(args: string[], stdinData: Buffer): Promise<{ err?: Error, stdout: string, stderr: string }> {
    return new Promise((resolvePromise) => {
      const resolve = (err?: Error) => {
        resolvePromise({
          err,
          stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
          stderr: Buffer.concat(stderrChunks).toString('utf-8')
        });
      };

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      const fileProcess = ChildProcess.spawn('file', args, { stdio: ['pipe', 'pipe', 'pipe'] });

      fileProcess.stdout.on('data', (data) => {
        stdoutChunks.push(data);
      });
      fileProcess.stderr.on('data', (data) => {
        stderrChunks.push(data);
      });

      fileProcess.on('error', resolve);
      fileProcess.on('exit', (code) => {
        if (code !== 0) {
          resolve(new Error(`'file' exited with code ${code}`));
          return;
        }

        resolve();
      });


      fileProcess.stdin.on('error', (err) => {
        if ((err as any).errno !== Os.constants.errno.EPIPE) {
          resolve(err);
        }
      });
      fileProcess.stdin.end(stdinData);
    });
  }

  static isFileAppAvailable(): boolean {
    const fileProcess = ChildProcess.spawnSync('file', ['--version']);

    if (fileProcess.error) {
      if ((fileProcess.error as any)?.code == 'ENOENT') {
        return false;
      }

      throw fileProcess.error;
    }

    return fileProcess.status == 0;
  }
}
