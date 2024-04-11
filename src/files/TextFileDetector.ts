import Path from 'node:path';
import { singleton } from 'tsyringe';
import FileTypeDetector from './FileTypeDetector';

@singleton()
export default class TextFileDetector {
  private static readonly TEXT_TYPES = [
    'application/json',
    'application/xml',
    'application/csv',
    'application/x-httpd-php',
    'application/x-sql',
    'application/javascript',
    'application/x-sh',
    'application/xliff+xml',
    'application/x-empty'
  ];
  private static readonly NON_TEXT_TYPES = [
    'application/vnd.microsoft.portable-executable',
    'application/vnd.ms-fontobject'
  ];
  private static readonly NON_TEXT_EXTENSIONS = [
    '.woff',
    '.woff2',
    '.eot',
    '.swf'
  ];

  constructor(private readonly fileTypeDetector: FileTypeDetector) {
  }

  async isTextFile(fileName: string, fileContent: Buffer): Promise<boolean> {
    const fileType = await this.fileTypeDetector.getMimeType(fileName, fileContent);
    if (fileType == null) {
      return false;
    }

    const result = fileType.startsWith('text/') || TextFileDetector.TEXT_TYPES.includes(fileType);
    if (!result) {
      this.logUnsupportedMimeType(fileType, fileName);
    }
    return result;
  }

  // TODO: Falsche Stelle zum Loggen
  private logUnsupportedMimeType(mimeType: string, filePath: string): void {
    if (mimeType.startsWith('image/')
      || mimeType.startsWith('video/')
      || mimeType.startsWith('audio/')
      || mimeType.startsWith('font/')
      || TextFileDetector.NON_TEXT_TYPES.includes(mimeType)) {
      return;
    }

    if (mimeType == 'application/octet-stream' && TextFileDetector.NON_TEXT_EXTENSIONS.includes(Path.extname(filePath).toLowerCase())) {
      return;
    }

    console.log(`Cannot index file ${JSON.stringify(Path.basename(filePath))} of type ${mimeType}`);
  }
}
