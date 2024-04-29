import { And, Or, Query, Term, Word } from '../parser/QueryParser';
import { TokenType } from '../parser/QueryTokenizer';
import QualifierParser, { ParsedQualifier } from '../parser/tokens/QualifierParser';
import RegExParser from '../parser/tokens/RegExParser';
import TextParser from '../parser/tokens/TextParser';

export type SearchQueryResult = {
  sql: string;
  params: (string | number)[];
}

export type SearchQueryRow = {
  full_name: string;
  default_branch: string;
  project_url: string;
  avatar_url: string | null;
  file_path: string;
  content: string;
}

export default class SearchQuerySqlBuilder {
  private static readonly FIELDS_TO_SELECT = ['repositories.full_name', 'repositories.default_branch', 'repositories.project_url', 'repositories.avatar_url', 'repository_files.file_path'];
  private static readonly textParser = new TextParser();
  private static readonly regExParser = new RegExParser();
  private static readonly qualifierParser = new QualifierParser();

  private sql = `
SELECT
  ${SearchQuerySqlBuilder.FIELDS_TO_SELECT.join(', ')},
  string_agg(file_chunks.content, '' ORDER BY file_chunks.order ASC) AS content
FROM
  files
INNER JOIN
  repository_files ON files.sha256 = repository_files.file_sha256
INNER JOIN
  repositories ON repository_files.project_id = repositories.gitlab_project_id
INNER JOIN
  "_RepositoryToUser" ON repositories.gitlab_project_id = "_RepositoryToUser"."A"
INNER JOIN
  file_chunks ON files.sha256 = file_chunks.file_sha256
WHERE
  "_RepositoryToUser"."B" = $1`;
  private readonly params: (string | number)[] = [];

  constructor(query: Query, userId: number) {
    this.params.push(userId);
    this.visitQuery(query);
  }

  get(): SearchQueryResult {
    return {
      sql: this.sql,
      params: this.params
    };
  }

  private visitQuery(query: Query): void {
    if (query.nodes.length === 0) {
      return;
    }

    this.sql += ' AND (';
    for (let i = 0; i < query.nodes.length; ++i) {
      if (i > 0) {
        this.sql += ' AND';
      }
      this.visitAnd(query.nodes[i]);
    }
    this.sql += ')';

    this.sql += `\nGROUP BY\n  ${SearchQuerySqlBuilder.FIELDS_TO_SELECT.join(',\n  ')},\n  files.created_at`;
    this.sql += '\nORDER BY\n  files.created_at DESC;';
  }

  private visitAnd(and: And): void {
    if (and.nodes.length === 0) {
      throw new Error('Expected OR node to have at least one child');
    }

    this.sql += ' (';
    for (let i = 0; i < and.nodes.length; ++i) {
      if (i > 0) {
        this.sql += ' AND';
      }
      this.visitOr(and.nodes[i]);
    }
    this.sql += ')';
  }

  private visitOr(or: Or): void {
    if (or.nodes.length === 0) {
      throw new Error('Expected OR node to have at least one child');
    }

    this.sql += ' (';
    for (let i = 0; i < or.nodes.length; ++i) {
      if (i > 0) {
        this.sql += ' OR';
      }
      this.visitTerm(or.nodes[i]);
    }
    this.sql += ')';
  }

  private visitTerm(term: Term): void {
    if (term.negated) {
      this.sql += ' NOT';
    }

    if (term.node instanceof And) {
      this.visitAnd(term.node);
    } else {
      this.visitWord(term.node);
    }
  }

  private visitWord(word: Word): void {
    if (word.value.value == null) {
      throw new Error('Expected word to have a value');
    }

    if (word.value.type === TokenType.TEXT) {
      this.visitWordText(SearchQuerySqlBuilder.textParser.parse(word.value.value));
      return;
    }
    if (word.value.type === TokenType.REGEX) {
      this.visitWordRegex(SearchQuerySqlBuilder.regExParser.parse(word.value.value));
      return;
    }
    if (word.value.type === TokenType.QUALIFIER) {
      this.visitWordQualifier(SearchQuerySqlBuilder.qualifierParser.parse(word.value.value));
      return;
    }

    throw new Error('Unsupported word type: ' + word.value.type);
  }

  private visitWordText(parsedValue: string): void {
    const paramNumber = this.params.push(`%${this.escapeForLikePattern(parsedValue)}%`);
    this.sql += ` file_chunks.content iLIKE $${paramNumber}`;
  }

  private visitWordRegex(pattern: RegExp): void {
    const paramNumber = this.params.push(pattern.source);
    this.sql += ` file_chunks.content ~* $${paramNumber}`;
  }

  private visitWordQualifier(qualifier: ParsedQualifier): void {
    if (qualifier.value.type === TokenType.TEXT) {
      const value = qualifier.info.prepareValue(SearchQuerySqlBuilder.textParser.parse(qualifier.value.value!));
      const paramNumber = this.params.push(qualifier.info.prepareForLike(this.escapeForLikePattern(value)));
      this.sql += ` ${qualifier.info.databaseField} iLIKE $${paramNumber}`;
      return;
    }

    if (qualifier.value.type === TokenType.REGEX) {
      const paramNumber = this.params.push(SearchQuerySqlBuilder.regExParser.parse(qualifier.value.value!).source);
      this.sql += ` ${qualifier.info.databaseField} ~* $${paramNumber}`;
      return;
    }

    throw new Error('Unsupported qualifier value type: ' + qualifier.value.type);
  }

  private escapeForLikePattern(input: string): string {
    return input.replace(/\\/g, '\\\\')
      .replace(/_/g, '\\_')
      .replace(/%/g, '\\%');
  }
}
