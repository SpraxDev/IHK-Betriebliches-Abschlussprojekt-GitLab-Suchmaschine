export default class TextParser {
  parse(tokenValue: string): string {
    if (tokenValue.startsWith('"') && tokenValue.endsWith('"')) {
      return tokenValue.slice(1, -1);
    }
    return tokenValue;
  }
}
