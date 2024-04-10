import { And, Or, Query, Term, Word } from '../parser/QueryParser';
import { TokenType } from '../parser/QueryTokenizer';
import RegExParser from '../parser/tokens/RegExParser';
import TextParser from '../parser/tokens/TextParser';

export type Match = [start: number, end: number];

// FIXME: Does not really respect the AST/Query but just searches and highlights all text tokens
export default class SearchResultMatchFinder {
  private static readonly textParser = new TextParser();
  private static readonly regExParser = new RegExParser();

  private readonly content: string;

  public readonly matches: Match[] = [];

  constructor(query: Query, content: string) {
    this.content = content;
    this.matches = this.mergeAndSortMatches(this.visitQuery(query));
  }

  private visitQuery(query: Query): Match[] {
    if (query.nodes.length === 0) {
      return [];
    }

    const matches: Match[] = [];
    for (let i = 0; i < query.nodes.length; ++i) {
      matches.push(...this.visitAnd(query.nodes[i]));
    }
    return matches;
  }

  private visitAnd(and: And): Match[] {
    if (and.nodes.length === 0) {
      throw new Error('Expected AND node to have at least one child');
    }

    let matches: Match[] = this.visitOr(and.nodes[0]);
    for (let i = 1; i < and.nodes.length; ++i) {
      const orMatches = this.visitOr(and.nodes[i]);
      matches = this.mergeMatches(matches, orMatches);
    }
    return matches;
  }

  private visitOr(or: Or): Match[] {
    if (or.nodes.length === 0) {
      throw new Error('Expected OR node to have at least one child');
    }

    let matches: Match[] = [];
    for (let i = 0; i < or.nodes.length; ++i) {
      const termMatches = this.visitTerm(or.nodes[i]);
      matches = this.unionMatches(matches, termMatches);
    }
    return matches;
  }

  private visitTerm(term: Term): Match[] {
    let matches: Match[];
    if (term.node instanceof And) {
      matches = this.visitAnd(term.node);
    } else {
      matches = this.visitWord(term.node);
    }

    if (term.negated) {
      // FIXME: Implement negation
      return [];
    }

    return matches;
  }

  private visitWord(word: Word): Match[] {
    if (word.value.value == null) {
      throw new Error('Expected word to have a value');
    }

    if (word.value.type === TokenType.TEXT) {
      return this.visitWordText(SearchResultMatchFinder.textParser.parse(word.value.value));
    }
    if (word.value.type === TokenType.REGEX) {
      return this.visitWordRegex(SearchResultMatchFinder.regExParser.parse(word.value.value));
    }
    if (word.value.type === TokenType.QUALIFIER) {
      return [];
    }

    throw new Error('Unsupported word type: ' + word.value.type);
  }

  private visitWordText(parsedValue: string): Match[] {
    const lowerContent = this.content.toLowerCase();
    const lowerWordValue = parsedValue.toLowerCase();

    const matches: Match[] = [];
    let index = 0;
    while ((index = lowerContent.indexOf(lowerWordValue, index)) !== -1) {
      matches.push([index, index + lowerWordValue.length]);
      index += lowerWordValue.length;
    }

    return matches;
  }

  private visitWordRegex(pattern: RegExp): Match[] {
    const matches: Match[] = [];

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(this.content)) !== null) {
      matches.push([match.index, pattern.lastIndex]);
    }

    return matches;
  }

  private unionMatches(matches1: Match[], matches2: Match[]): Match[] {
    return [...matches1, ...matches2.filter(match2 => !matches1.some(match1 => this.isEqualMatch(match1, match2)))];
  }

  private mergeMatches(matches1: Match[], matches2: Match[]): Match[] {
    return [...matches1, ...matches2];
  }

  private isEqualMatch(match1: Match, match2: Match): boolean {
    return match1[0] === match2[0] && match1[1] === match2[1];
  }

  private mergeAndSortMatches(matches: Match[]): Match[] {
    const result: Match[] = [];

    for (const match of matches) {
      const existingThatEndsWhereMatchStarts = result.find(existing => existing[1] === match[0]);
      if (existingThatEndsWhereMatchStarts != null) {
        existingThatEndsWhereMatchStarts[1] = match[1];
        continue;
      }

      const existingThatStartsWhereMatchEnds = result.find(existing => existing[0] === match[1]);
      if (existingThatStartsWhereMatchEnds != null) {
        existingThatStartsWhereMatchEnds[0] = match[0];
        continue;
      }

      result.push(match);
    }

    result.sort((a, b) => a[0] - b[0]);
    return result;
  }
}
