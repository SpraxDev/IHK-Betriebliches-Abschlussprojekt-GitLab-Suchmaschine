import { Prisma } from '@prisma/client';
import { singleton } from 'tsyringe';
import DatabaseClient from '../../database/DatabaseClient';
import { And, Or, Query, Term, Word } from '../parser/QueryParser';
import { TokenType } from '../parser/QueryTokenizer';

@singleton()
export default class SearchQueryExecutor {
  constructor(private readonly prisma: DatabaseClient) {
  }

  // TODO: explicit return type
  async generate(query: Query) {
    return this.prisma.file.findMany({
      select: {
        sha256: true
      },
      where: {
        ...this.visitQuery(query),
        repositoryFiles: {
          every: {
            repository: {
              usersWithReadAccess: {
                every: {
                  userId: 1
                }
              }
            }
          }
        }
      }
    });
  }

  private visitQuery(query: Query): Prisma.FileWhereInput {
    const filters: Prisma.FileWhereInput[] = [];
    for (const node of query.nodes) {
      filters.push(this.visitAnd(node));
    }
    return { AND: filters };
  }

  private visitAnd(and: And): Prisma.FileWhereInput {
    const filters: Prisma.FileWhereInput[] = [];
    for (const node of and.nodes) {
      filters.push(this.visitOr(node));
    }
    return { AND: filters };
  }

  private visitOr(or: Or): Prisma.FileWhereInput {
    const filters: Prisma.FileWhereInput[] = [];
    for (const node of or.nodes) {
      filters.push(this.visitTerm(node));
    }
    return { OR: filters };
  }

  private visitTerm(term: Term): Prisma.FileWhereInput {
    let result: Prisma.FileWhereInput;
    if (term.node instanceof And) {
      result = this.visitAnd(term.node);
    } else {
      result = this.visitWord(term.node);
    }

    if (term.negated) {
      return { NOT: result };
    }
    return result;
  }

  private visitWord(word: Word): Prisma.FileWhereInput {
    if (word.value.value == null) {
      throw new Error('Expected word to have a value');
    }
    if (word.value.type !== TokenType.TEXT) {
      throw new Error('Expected word to be of type TEXT: ' + word);
    }

    return {
      content: {
        mode: 'insensitive',
        contains: this.escapeForLikePattern(word.value.value)
      }
    };
  }

  private escapeForLikePattern(input: string): string {
    return input.replace(/\\/g, '\\\\')
      .replace(/_/g, '\\_')
      .replace(/%/g, '\\%');
  }
}
