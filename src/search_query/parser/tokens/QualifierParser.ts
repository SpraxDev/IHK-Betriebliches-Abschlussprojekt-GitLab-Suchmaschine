import { QualifierInfo, QUALIFIERS } from '../../Qualifiers';
import QueryTokenizer, { Token } from '../QueryTokenizer';

export type ParsedQualifier = {
  info: QualifierInfo;
  value: Token;
};

export default class QualifierParser {
  private static readonly tokenizer = new QueryTokenizer();

  parse(tokenValue: string): ParsedQualifier {
    const key = tokenValue.split(':')[0].toLowerCase();
    if (Object.hasOwn(QUALIFIERS, key) == null) {
      throw new Error('Unknown qualifier key');
    }

    const value = tokenValue.substring(key.length + 1);
    const valueTokens = QualifierParser.tokenizer.tokenize(value);
    if (valueTokens.length !== 1) {
      throw new Error('Invalid qualifier value');
    }

    return {
      info: QUALIFIERS[key],
      value: valueTokens[0]
    };
  }
}
