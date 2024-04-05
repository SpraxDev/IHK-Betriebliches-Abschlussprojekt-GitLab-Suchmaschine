import assert from 'node:assert';
import { Token, TokenType } from './QueryTokenizer';
import TokenStream from './TokenStream';

export class Query {
  public readonly nodes: And[] = [];

  toJSON(): Record<string, unknown> {
    return {
      Query: this.nodes
    };
  }
}

export class And {
  public readonly nodes: Or[] = [];

  toJSON(): Record<string, unknown> {
    return {
      And: this.nodes
    };
  }
}

export class Or {
  public readonly nodes: Term[] = [];

  toJSON(): Record<string, unknown> {
    return {
      Or: this.nodes
    };
  }
}

export class Word {
  public readonly value: Token;

  constructor(value: Token) {
    assert([TokenType.TEXT, TokenType.REGEX, TokenType.QUALIFIER].includes(value.type));
    this.value = value;
  }

  toJSON(): Record<string, unknown> {
    return {
      Word: this.value
    };
  }
}

export class Term {
  public readonly node: Word | And;
  public readonly negated: boolean;

  constructor(node: Word | And, negated: boolean) {
    this.node = node;
    this.negated = negated;
  }

  toJSON(): Record<string, unknown> {
    return {
      Term: {
        node: this.node,
        negated: this.negated
      }
    };
  }
}

export default class QueryParser {
  private readonly tokenStream: TokenStream;

  get nextToken(): Token | null {
    return this.tokenStream.peek();
  }

  constructor(tokens: Token[]) {
    this.tokenStream = new TokenStream(tokens);
  }

  parseQuery(): Query {
    const q = new Query();
    while (!this.tokenStream.done()) {
      q.nodes.push(this.parseAnd());
    }
    return q;
  }

  private parseAnd(): And {
    const a = new And();
    a.nodes.push(this.parseOr());
    while (this.nextToken != null && this.isAllowedTokenForImplicitAnd(this.nextToken)) {
      if (this.nextToken.type === TokenType.AND) {
        this.consumeToken();
      }
      a.nodes.push(this.parseOr());
    }
    return a;
  }

  private parseOr(): Or {
    const o = new Or();
    o.nodes.push(this.parseTerm());
    while (this.nextToken?.type === TokenType.OR) {
      this.consumeToken();
      o.nodes.push(this.parseTerm());
    }
    return o;
  }

  private parseTerm(): Term {
    let negated = false;

    if (this.nextToken?.type === TokenType.NOT) {
      this.consumeToken();
      negated = true;
    }

    if (this.nextToken != null && this.isWord(this.nextToken)) {
      const t = this.nextToken;
      this.consumeToken();
      return new Term(new Word(t), negated);
    }
    if (this.nextToken?.type === TokenType.OPEN_PAREN) {
      this.consumeToken();
      const and = this.parseAnd();
      this.expectToken(TokenType.CLOSE_PAREN);
      return new Term(and, negated);
    }

    throw new Error('invalid syntax');
  }

  private isWord(token: Token): boolean {
    return [TokenType.TEXT, TokenType.REGEX, TokenType.QUALIFIER].includes(token.type);
  }

  private isAllowedTokenForImplicitAnd(token: Token): boolean {
    return this.isWord(token) ||
      [TokenType.AND, TokenType.OPEN_PAREN, TokenType.NOT].includes(token.type);
  }

  private consumeToken(): void {
    this.tokenStream.pop();
  }

  private expectToken(t: TokenType): void {
    if (this.nextToken != null && this.nextToken.type !== t) {
      throw new Error(`expected ${t} but got ${JSON.stringify(this.nextToken)}`);
    }

    this.consumeToken();
  }
}
