import type { Prisma } from '@prisma/client';
import { singleton } from 'tsyringe';
import DatabaseClient from '../../database/DatabaseClient';
import QueryParser from '../parser/QueryParser';
import { Token } from '../parser/QueryTokenizer';
import SearchQuerySqlBuilder, { SearchQueryRow } from './SearchQuerySqlBuilder';

@singleton()
export default class SearchQueryExecutor {
  constructor(
    private readonly prisma: DatabaseClient
  ) {
  }

  execute(tokens: Token[], userId: number): Prisma.PrismaPromise<SearchQueryRow[]> | SearchQueryRow[] {
    if (tokens.length === 0) {
      return [];
    }

    const parsedQuery = new QueryParser(tokens).parseQuery();
    const sqlQuery = new SearchQuerySqlBuilder(parsedQuery, userId).get();
    return this.prisma.$queryRawUnsafe(sqlQuery.sql, ...sqlQuery.params);
  }
}
