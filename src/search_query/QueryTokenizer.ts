import { singleton } from 'tsyringe';

export enum TokenType {
  TEXT = 'TEXT',
  REGEX = 'REGEX',
  QUALIFIER = 'QUALIFIER',

  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  OPEN_PAREN = 'OPEN_PAREN',
  CLOSE_PAREN = 'CLOSE_PAREN'
}

export interface Token {
  type: TokenType;
  value?: string;
}

@singleton()
export default class QueryTokenizer {
  tokenize(query: string): Token[] {
    const tokens: Token[] = [];

    let currentToken = '';
    let inRegex = false;
    let inQuotes = false;
    let nextCharIsEscaped = false;
    let currentTokenIncludesEscapedChar = false;
    let currentTokenLooksLikeQualifier = false;
    for (let i = 0; i < query.length; ++i) {
      const char = query[i];

      if (nextCharIsEscaped) {
        if (inRegex) {
          currentToken += '\\';
        }
        currentToken += char;
        nextCharIsEscaped = false;
        continue;
      }

      if (char === '/') {
        if (inRegex) {
          tokens.push({ type: TokenType.REGEX, value: currentToken + char });
          currentToken = '';
          inRegex = false;
          currentTokenIncludesEscapedChar = false;
          currentTokenLooksLikeQualifier = false;
          continue;
        }

        if (currentToken === '') {
          inRegex = true;
          currentToken += char;
          continue;
        }
      }

      if (char === '\\') {
        nextCharIsEscaped = true;
        currentTokenIncludesEscapedChar = true;
        continue;
      }

      if (!inRegex) {
        if (char === '"') {
          inQuotes = !inQuotes;
          currentToken += char;

          if (!inQuotes && currentToken !== '') {
            tokens.push({
              type: currentTokenLooksLikeQualifier ? TokenType.QUALIFIER : TokenType.TEXT,
              value: currentToken
            });
            currentToken = '';
            currentTokenIncludesEscapedChar = false;
            currentTokenLooksLikeQualifier = false;
          }
          continue;
        }

        if (!inQuotes) {
          if (currentToken === '' && char === '(') {
            tokens.push({ type: TokenType.OPEN_PAREN });
            currentToken = '';
            nextCharIsEscaped = false;
            continue;
          }

          const nextChar: string | undefined = query[i + 1];
          if (char === ')' && currentToken !== '' && (nextChar === ' ' || nextChar == null)) {
            if (currentTokenLooksLikeQualifier) {
              tokens.push({ type: TokenType.QUALIFIER, value: currentToken });
            } else {
              tokens.push(this.createTextOrBooleanToken(currentToken, currentTokenIncludesEscapedChar));
            }
            tokens.push({ type: TokenType.CLOSE_PAREN });

            currentToken = '';
            currentTokenIncludesEscapedChar = false;
            currentTokenLooksLikeQualifier = false;
            continue;
          }

          if (char === ':') {
            if (/^[a-z]+$/i.test(currentToken)) {
              currentToken += char;
              currentTokenLooksLikeQualifier = true;
              continue;
            }
          }

          if (char === ' ') {
            if (currentToken !== '') {
              if (currentTokenLooksLikeQualifier) {
                tokens.push({ type: TokenType.QUALIFIER, value: currentToken });
              } else {
                tokens.push(this.createTextOrBooleanToken(currentToken, currentTokenIncludesEscapedChar));
              }

              currentToken = '';
              currentTokenIncludesEscapedChar = false;
              currentTokenLooksLikeQualifier = false;
            }
            continue;
          }
        }
      }

      currentToken += char;
    }

    if (nextCharIsEscaped) {
      throw new Error('Unexpected end of input: Expected character after backslash');
    }
    if (currentToken !== '') {
      if (currentTokenLooksLikeQualifier) {
        tokens.push({ type: TokenType.QUALIFIER, value: currentToken });
      } else {
        tokens.push(this.createTextOrBooleanToken(currentToken, currentTokenIncludesEscapedChar));
      }
    }

    return tokens;
  }

  private createTextOrBooleanToken(value: string, currentTokenIncludesEscapedChar: boolean): Token {
    if (currentTokenIncludesEscapedChar) {
      return { type: TokenType.TEXT, value: value };
    }

    switch (value) {
      case '&&':
        return { type: TokenType.AND };
      case '||':
        return { type: TokenType.OR };
      case ')':
        return { type: TokenType.CLOSE_PAREN };
      default:
        return { type: TokenType.TEXT, value: value };
    }
  }
}
