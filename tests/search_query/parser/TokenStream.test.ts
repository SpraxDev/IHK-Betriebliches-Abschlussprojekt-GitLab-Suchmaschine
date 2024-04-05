import { TokenType } from '../../../src/search_query/parser/QueryTokenizer';
import TokenStream from '../../../src/search_query/parser/TokenStream';

const tokens = [
  { type: TokenType.TEXT, value: 'Hello' },
  { type: TokenType.AND },
  { type: TokenType.QUALIFIER, value: 'path:src/' }
];

describe('TokenStream', () => {
  test('pop', () => {
    const tokenStream = new TokenStream(tokens);

    expect(tokenStream.pop()).toStrictEqual(tokens[0]);
    expect(tokenStream.pop()).toStrictEqual(tokens[1]);
    expect(tokenStream.pop()).toStrictEqual(tokens[2]);
    expect(tokenStream.pop()).toBeNull();
  });

  test('peek', () => {
    const tokenStream = new TokenStream(tokens);

    expect(tokenStream.peek()).toStrictEqual(tokens[0]);
    expect(tokenStream.peek()).toStrictEqual(tokens[0]);

    tokenStream.pop();
    expect(tokenStream.peek()).toStrictEqual(tokens[1]);

    tokenStream.pop();
    expect(tokenStream.peek()).toStrictEqual(tokens[2]);

    tokenStream.pop();
    expect(tokenStream.peek()).toBeNull();
  });

  test('done', () => {
    const tokenStream = new TokenStream(tokens);

    expect(tokenStream.done()).toBeFalsy();

    tokenStream.pop();
    expect(tokenStream.done()).toBeFalsy();

    tokenStream.pop();
    expect(tokenStream.done()).toBeFalsy();

    tokenStream.pop();
    expect(tokenStream.done()).toBeTruthy();

    tokenStream.pop();
    expect(tokenStream.done()).toBeTruthy();
  });
});
