import QueryParser, { Query } from '../../../src/search_query/parser/QueryParser';
import QueryTokenizer, { TokenType } from '../../../src/search_query/parser/QueryTokenizer';
import TestQueryBuilder from './TestQueryBuilder';

function assertJsonEqual(query: string, expected: object): void {
  const tokens = new QueryTokenizer().tokenize(query);
  const parsedQuery = new QueryParser(tokens).parseQuery();
  expect(JSON.parse(JSON.stringify(parsedQuery))).toEqual(expected);
}

describe('QueryParser', () => {
  test.each([
    ['Hello', new TestQueryBuilder().withAndWords({ type: TokenType.TEXT, value: 'Hello' }).build()],

    ['Hello world', new TestQueryBuilder()
      .withAndWords({ type: TokenType.TEXT, value: 'Hello' }, { type: TokenType.TEXT, value: 'world' })
      .build()
    ],
    ['A && B', new TestQueryBuilder()
      .withAndWords({ type: TokenType.TEXT, value: 'A' }, { type: TokenType.TEXT, value: 'B' })
      .build()
    ],
    ['A || B', new TestQueryBuilder()
      .withOrWords({ type: TokenType.TEXT, value: 'A' }, { type: TokenType.TEXT, value: 'B' })
      .build()
    ]
  ])('%s', (query: string, expected: Query): void => {
    const tokens = new QueryTokenizer().tokenize(query);
    expect(new QueryParser(tokens).parseQuery()).toEqual<Query>(expected);
  });

  test.each([
    'A && B || C',
    'A B || C'
  ])('%s', (query: string) => {
    const expected = {
      Query: [
        {
          And: [
            {
              Or: [
                { Term: { node: { Word: { type: TokenType.TEXT, value: 'A' } }, negated: false } }
              ]
            },
            {
              Or: [
                { Term: { node: { Word: { type: TokenType.TEXT, value: 'B' } }, negated: false } },
                { Term: { node: { Word: { type: TokenType.TEXT, value: 'C' } }, negated: false } }
              ]
            }
          ]
        }
      ]
    };

    assertJsonEqual(query, expected);
  });

  test.each([
    'A || B && C',
    'A || B C'
  ])('%s', (query: string) => {
    const expected = {
      Query: [
        {
          And: [
            {
              Or: [
                { Term: { node: { Word: { type: TokenType.TEXT, value: 'A' } }, negated: false } },
                { Term: { node: { Word: { type: TokenType.TEXT, value: 'B' } }, negated: false } }
              ]
            },
            {
              Or: [
                { Term: { node: { Word: { type: TokenType.TEXT, value: 'C' } }, negated: false } }
              ]
            }
          ]
        }
      ]
    };

    assertJsonEqual(query, expected);
  });

  test('Complex full round trip query', () => {
    const query = 'language:php && content:"Hello hi" "A""B" \\&& (Hallo Welt || "Hallo () /[0-9]+/ PHP") 👋🏿';
    const expected = {
      Query: [
        {
          And: [
            {
              Or: [
                { Term: { node: { Word: { type: TokenType.QUALIFIER, value: 'language:php' } }, negated: false } }
              ]
            },
            {
              Or: [
                {
                  Term: { node: { Word: { type: TokenType.QUALIFIER, value: 'content:"Hello hi"' } }, negated: false }
                }
              ]
            },
            {
              Or: [
                {
                  Term: { node: { Word: { type: TokenType.TEXT, value: '"A"' } }, negated: false }
                }
              ]
            },
            {
              Or: [
                {
                  Term: { node: { Word: { type: TokenType.TEXT, value: '"B"' } }, negated: false }
                }
              ]
            },
            {
              Or: [
                {
                  Term: { node: { Word: { type: TokenType.TEXT, value: '&&' } }, negated: false }
                }
              ]
            },
            {
              Or: [
                {
                  Term: {
                    node: {
                      And: [
                        {
                          Or: [
                            { Term: { node: { Word: { type: TokenType.TEXT, value: 'Hallo' } }, negated: false } }
                          ]
                        },
                        {
                          Or: [
                            { Term: { node: { Word: { type: TokenType.TEXT, value: 'Welt' } }, negated: false } },
                            {
                              Term: {
                                node: { Word: { type: TokenType.TEXT, value: '"Hallo () /[0-9]+/ PHP"' } },
                                negated: false
                              }
                            }
                          ]
                        }
                      ]
                    },
                    negated: false
                  }
                }
              ]
            },
            {
              Or: [
                { Term: { node: { Word: { type: TokenType.TEXT, value: '👋🏿' } }, negated: false } }
              ]
            }
          ]
        }
      ]
    };

    assertJsonEqual(query, expected);
  });

  //  console.dir(new QueryParser('(A && B) || C').parseQuery(), { depth: null });
  //  ['A && (B || C)', null],
});
