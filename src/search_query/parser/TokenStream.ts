import { Token } from './QueryTokenizer';

export default class TokenStream {
  private readonly tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  pop(): Token | null {
    return this.tokens[this.position++] ?? null;
  }

  peek(): Token | null {
    return this.tokens[this.position] ?? null;
  }

  done(): boolean {
    return this.position >= this.tokens.length;
  }
}
