import QueryTokenizer, { Token, TokenType } from '../../../src/search_query/parser/QueryTokenizer';

const queryTokenizer = new QueryTokenizer();

function executeTest(query: string, expected: Token[]): void {
  expect(queryTokenizer.tokenize(query)).toEqual<Token[]>(expected);
}

describe('TEXT token', () => {
  test.each([
    ['Hello', [{ type: TokenType.TEXT, value: 'Hello' }] satisfies Token[]],
    ['  Hello  World  ', [
      { type: TokenType.TEXT, value: 'Hello' },
      { type: TokenType.TEXT, value: 'World' }
    ] satisfies Token[]],
    ['Hello world 👋🏿', [
      { type: TokenType.TEXT, value: 'Hello' },
      { type: TokenType.TEXT, value: 'world' },
      { type: TokenType.TEXT, value: '👋🏿' }
    ] satisfies Token[]],
    ['"Hello world 👋🏿"', [{ type: TokenType.TEXT, value: '"Hello world 👋🏿"' }] satisfies Token[]],
    ['Hello\\ world\\ 👋🏿', [{ type: TokenType.TEXT, value: 'Hello world 👋🏿' }] satisfies Token[]],
    ['Namespace\\\\Class', [{ type: TokenType.TEXT, value: 'Namespace\\Class' }] satisfies Token[]],
    ['"A""B"', [{ type: TokenType.TEXT, value: '"A"' }, { type: TokenType.TEXT, value: '"B"' }] satisfies Token[]],
    ['\\&&', [{ type: TokenType.TEXT, value: '&&' }] satisfies Token[]],
    ['\\||', [{ type: TokenType.TEXT, value: '||' }] satisfies Token[]]
  ])('%s', executeTest);
});

describe('REGEX token', () => {
  test.each([
    ['/Hello/', [{ type: TokenType.REGEX, value: '/Hello/' }] satisfies Token[]],
    ['\\/Hello/', [{ type: TokenType.TEXT, value: '/Hello/' }] satisfies Token[]],
    ['Hello/world', [{ type: TokenType.TEXT, value: 'Hello/world' }] satisfies Token[]],
    ['/^[a-z0-9() _-]+$/', [{ type: TokenType.REGEX, value: '/^[a-z0-9() _-]+$/' }] satisfies Token[]],
    ['/^[a-z]+\\/$/', [{ type: TokenType.REGEX, value: '/^[a-z]+\\/$/' }] satisfies Token[]]
  ])('%s', executeTest);
});

describe('QUALIFIER token', () => {
  test.each([
    ['path:*.ts', [{ type: TokenType.QUALIFIER, value: 'path:*.ts' }] satisfies Token[]],
    ['path:"src/Component/"', [{ type: TokenType.QUALIFIER, value: 'path:"src/Component/"' }] satisfies Token[]],
    ['Path:src/Component/', [{ type: TokenType.QUALIFIER, value: 'Path:src/Component/' }] satisfies Token[]],

    [':value', [{ type: TokenType.TEXT, value: ':value' }] satisfies Token[]],
    ['123abc:value', [{ type: TokenType.TEXT, value: '123abc:value' }] satisfies Token[]],
    ['abc123:value', [{ type: TokenType.TEXT, value: 'abc123:value' }] satisfies Token[]]
  ])('%s', executeTest);
});

describe('Boolean tokens', () => {
  test.each([
    ['&&', [{ type: TokenType.AND }] satisfies Token[]],
    ['||', [{ type: TokenType.OR }] satisfies Token[]],
    ['(', [{ type: TokenType.OPEN_PAREN }] satisfies Token[]],
    [')', [{ type: TokenType.CLOSE_PAREN }] satisfies Token[]],
    ['(A)', [
      { type: TokenType.OPEN_PAREN },
      { type: TokenType.TEXT, value: 'A' },
      { type: TokenType.CLOSE_PAREN }
    ] satisfies Token[]],
    ['( A ) ( B )', [
      { type: TokenType.OPEN_PAREN },
      { type: TokenType.TEXT, value: 'A' },
      { type: TokenType.CLOSE_PAREN },
      { type: TokenType.OPEN_PAREN },
      { type: TokenType.TEXT, value: 'B' },
      { type: TokenType.CLOSE_PAREN }
    ] satisfies Token[]],
    ['()', [{ type: TokenType.OPEN_PAREN }, { type: TokenType.CLOSE_PAREN }] satisfies Token[]],
    ['( )', [{ type: TokenType.OPEN_PAREN }, { type: TokenType.CLOSE_PAREN }] satisfies Token[]]
  ])('%s', executeTest);
});

describe('Complex queries', () => {
  test.each([
    ['"Hallo () /[0-9]+/ PHP"', [
      { type: TokenType.TEXT, value: '"Hallo () /[0-9]+/ PHP"' }
    ] satisfies Token[]],
    ['language:php && content:"Hello world" "A""B" \\&& (Hallo Welt || "Hallo () /[0-9]+/ PHP") 🖖🏿', [
      { type: TokenType.QUALIFIER, value: 'language:php' },
      { type: TokenType.AND },
      { type: TokenType.QUALIFIER, value: 'content:"Hello world"' },
      { type: TokenType.TEXT, value: '"A"' },
      { type: TokenType.TEXT, value: '"B"' },
      { type: TokenType.TEXT, value: '&&' },
      { type: TokenType.OPEN_PAREN },
      { type: TokenType.TEXT, value: 'Hallo' },
      { type: TokenType.TEXT, value: 'Welt' },
      { type: TokenType.OR },
      { type: TokenType.TEXT, value: '"Hallo () /[0-9]+/ PHP"' },
      { type: TokenType.CLOSE_PAREN },
      { type: TokenType.TEXT, value: '🖖🏿' }
    ] satisfies Token[]],
    ['/product(A|B|C)/ A && (path:src/b/*.ts || extension:/(js|ts)/)', [
      { type: TokenType.REGEX, value: '/product(A|B|C)/' },
      { type: TokenType.TEXT, value: 'A' },
      { type: TokenType.AND },
      { type: TokenType.OPEN_PAREN },
      { type: TokenType.QUALIFIER, value: 'path:src/b/*.ts' },
      { type: TokenType.OR },
      { type: TokenType.QUALIFIER, value: 'extension:/(js|ts)/' },
      { type: TokenType.CLOSE_PAREN }
    ] satisfies Token[]]
  ])('%s', executeTest);
});

describe('Invalid edge cases', () => {
  test('Backslash without escaping', () => {
    expect(() => queryTokenizer.tokenize('\\')).toThrow('Unexpected end of input: Expected character after backslash');
  });
});
