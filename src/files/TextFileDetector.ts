import Path from 'node:path';
import { singleton } from 'tsyringe';
import { logAndCaptureWarning } from '../SentrySdk';
import FileTypeDetector from './FileTypeDetector';

@singleton()
export default class TextFileDetector {
  private static readonly TEXT_TYPES = [
    'application/csv',
    'application/javascript',
    'application/json',
    'application/pgp-keys',
    'application/pgp-signature',
    'application/postscript',
    'application/vnd.cups-ppd',
    'application/vnd.font-fontforge-sfd',
    'application/x-httpd-php',
    'application/x-mswinurl',
    'application/x-ndjson',
    'application/x-sh',
    'application/x-sql',
    'application/x-sylk',
    'application/x-wine-extension-ini',
    'application/xliff+xml',
    'application/xml',
  ];
  private static readonly NON_TEXT_TYPES = [
    'application/gzip',
    'application/octet-stream',
    'application/pdf',  // TODO: Add support? maybe we can convert it into a basic/simple text representation
    'application/vnd.android.package-archive',
    'application/vnd.microsoft.portable-executable',
    'application/vnd.ms-fontobject',
    'application/vnd.ms-opentype',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-empty',
    'application/x-gettext-translation',
    'application/x-java-keystore',
    'application/x-ole-storage',
    'application/x-shockwave-flash',
    'application/zip',
  ];
  private static readonly NON_TEXT_EXTENSIONS = [
    '.eot',
    '.swf',
    '.woff',
    '.woff2',
  ];

  constructor(private readonly fileTypeDetector: FileTypeDetector) {
  }

  async isTextFile(fileName: string, fileContent: Buffer): Promise<boolean> {
    if (fileContent.length === 0 || fileContent.includes(0x0)) {
      return false;
    }

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

    logAndCaptureWarning(`Cannot index file of type ${mimeType}`, { fileExtension: Path.extname(filePath), mimeType });
  }
}
