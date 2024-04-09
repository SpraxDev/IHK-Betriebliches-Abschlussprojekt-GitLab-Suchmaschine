import { singleton } from 'tsyringe';
import { Match } from './SearchResultMatchFinder';

export type HighlightedHtmlChunk = {
  firstLineNumber: number;
  html: string;
}

@singleton()
export default class HighlightedHtmlGenerator {
  private static readonly CONTEXT_LINES = 4;
  private static readonly MAX_LINES_IN_BETWEEN_MATCHES = 10;

  generateHtml(unsafeContent: string, matches: Match[]): HighlightedHtmlChunk[] {
    const lineLengths = unsafeContent.split('\n').map(line => line.length + 1);
    const chunkedMatches: Match[][] = this.chunkMatches(matches, lineLengths);

    const result: HighlightedHtmlChunk[] = [];
    for (const chunk of chunkedMatches) {
      result.push(this.generateHtmlChunk(unsafeContent, chunk, lineLengths));
    }
    return result;
  }

  private generateHtmlChunk(unsafeContent: string, matches: Match[], lineLengths: number[]): HighlightedHtmlChunk {
    let firstLineIndex = this.findLineIndex(lineLengths, matches[0][0]);
    let lastLineIndex = this.findLineIndex(lineLengths, matches[matches.length - 1][1]);

    firstLineIndex = Math.max(0, firstLineIndex - HighlightedHtmlGenerator.CONTEXT_LINES);
    lastLineIndex = Math.min(lineLengths.length - 1, lastLineIndex + HighlightedHtmlGenerator.CONTEXT_LINES);

    let result = '';
    let prevEnd = this.findLineStartIndex(lineLengths, firstLineIndex);
    for (const match of matches) {
      result += this.escapeHtml(unsafeContent.substring(prevEnd, match[0]));
      result += '<span class="highlighted-content">';
      result += this.escapeHtml(unsafeContent.substring(match[0], match[1]));
      result += '</span>';
      prevEnd = match[1];
    }
    result += this.escapeHtml(unsafeContent.substring(prevEnd, this.findLineStartIndex(lineLengths, lastLineIndex + 1)));

    return {
      firstLineNumber: firstLineIndex + 1,
      html: result
    };
  }

  private chunkMatches(matches: Match[], lineLengths: number[]): Match[][] {
    const result: Match[][] = [];
    for (const match of matches) {
      const prevChunk = result[result.length - 1];
      if (prevChunk == null) {
        result.push([match]);
        continue;
      }

      const prevMatch = prevChunk[prevChunk.length - 1];
      const prevLineIndex = this.findLineIndex(lineLengths, prevMatch[1]);
      const currentLineIndex = this.findLineIndex(lineLengths, match[0]);

      if ((currentLineIndex - prevLineIndex) <= HighlightedHtmlGenerator.MAX_LINES_IN_BETWEEN_MATCHES) {
        prevChunk.push(match);
      } else {
        result.push([match]);
      }
    }
    return result;
  }

  private findLineIndex(lineLengths: number[], charIndex: number): number {
    let charCount = 0;
    for (let i = 0; i < lineLengths.length; ++i) {
      charCount += lineLengths[i];
      if (charCount >= charIndex) {
        return i;
      }
    }
    return -1;
  }

  private findLineStartIndex(lineLengths: number[], lineIndex: number): number {
    let result = 0;
    for (let i = 0; i < lineIndex; ++i) {
      result += lineLengths[i];
    }
    return result;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
