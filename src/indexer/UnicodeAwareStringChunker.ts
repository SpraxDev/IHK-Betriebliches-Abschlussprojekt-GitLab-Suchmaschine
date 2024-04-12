import { singleton } from 'tsyringe';

@singleton()
export default class UnicodeAwareStringChunker {
  chunk(str: string, maxBytes: number): Buffer[] {
    const strBuffer = Buffer.from(str);
    const chunks: Buffer[] = [];
    let index = 0;

    let chunkStart = 0;
    let chunkBytes = 0;
    while (index < str.length) {
      const char = str[index];
      const charBytes = Buffer.byteLength(char);

      if ((chunkBytes + charBytes) > maxBytes) {
        chunks.push(strBuffer.subarray(chunkStart, chunkStart + chunkBytes));
        chunkStart += chunkBytes;
        chunkBytes = 0;
      }

      chunkBytes += charBytes;
      ++index;
    }

    if (chunkBytes > 0) {
      chunks.push(strBuffer.subarray(chunkStart, chunkStart + chunkBytes));
    }

    return chunks;
  }
}
