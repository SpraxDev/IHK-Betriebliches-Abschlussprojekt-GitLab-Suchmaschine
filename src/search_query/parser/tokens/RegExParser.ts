export default class RegExParser {
  parse(tokenValue: string): RegExp {
    const pattern = tokenValue.substring(1, tokenValue.length - 1);
    return new RegExp(pattern, 'gi');
  }
}
