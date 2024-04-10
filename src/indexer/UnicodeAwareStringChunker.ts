import { singleton } from 'tsyringe';

@singleton()
export default class UnicodeAwareStringChunker {
  chunk(str: string, maxBytes: number): string[] {
    const chunks: string[] = [];
    let index = 0;

    while (index < str.length) {
      let size = Math.min(maxBytes, str.length - index);
      let chunk = str.slice(index, index + size);

      while (size > 0 && chunk.codePointAt(size - 1)! > 127) {
        size--;
        chunk = str.slice(index, index + size);
      }

      chunks.push(chunk);
      index += size;
    }

    return chunks;
  }
}
