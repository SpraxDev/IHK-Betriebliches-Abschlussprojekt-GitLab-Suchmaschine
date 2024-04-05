import { And, Or, Query, Term, Word } from '../parser/QueryParser';
import { TokenType } from '../parser/QueryTokenizer';

export type SearchQueryResult = {
  sql: string;
  params: (string | number)[];
}

export type SearchQueryRow = {
  gitlab_project_id: number;
  display_name: string;
  full_name: string;
  file_path: string;
}

export default class SearchQuerySqlBuilder {
  private sql = `
SELECT
  repositories.gitlab_project_id,
  repositories.display_name,
  repositories.full_name,
  repository_files.file_path
FROM
  files
INNER JOIN
  repository_files ON files.sha256 = repository_files.file_sha256
INNER JOIN
  repositories ON repository_files.project_id = repositories.gitlab_project_id
INNER JOIN
  "_RepositoryToUser" ON repositories.gitlab_project_id = "_RepositoryToUser"."A"
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
      this.visitWordText(word.value.value);
      return;
    }
    if (word.value.type === TokenType.REGEX) {
      this.visitWordRegex(word.value.value);
      return;
    }

    throw new Error('Unsupported word type: ' + word.value.type);
  }

  private visitWordText(wordValue: string): void {
    const paramNumber = this.params.push(`%${this.escapeForLikePattern(wordValue)}%`);
    this.sql += ` files.content iLIKE $${paramNumber}`;
  }

  private visitWordRegex(wordValue: string): void {
    const paramNumber = this.params.push(wordValue.substring(1, wordValue.length - 1));
    this.sql += ` files.content ~* $${paramNumber}`;
  }

  private escapeForLikePattern(input: string): string {
    return input.replace(/\\/g, '\\\\')
      .replace(/_/g, '\\_')
      .replace(/%/g, '\\%');
  }
}
