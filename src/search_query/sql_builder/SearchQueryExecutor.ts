import { singleton } from 'tsyringe';
import DatabaseClient from '../../database/DatabaseClient';
import QueryParser, { Query } from '../parser/QueryParser';
import { Token } from '../parser/QueryTokenizer';
import HighlightedHtmlGenerator, { HighlightedHtmlChunk } from '../result_highlighter/HighlightedHtmlGenerator';
import SearchResultMatchFinder from '../result_highlighter/SearchResultMatchFinder';
import SearchQuerySqlBuilder, { SearchQueryRow } from './SearchQuerySqlBuilder';

export type SearchMatch = {
  projectDisplayName: string;
  urlToMatch: string;
  filePath: string;
  chunks: HighlightedHtmlChunk[];
}

@singleton()
export default class SearchQueryExecutor {
  constructor(
    private readonly prisma: DatabaseClient,
    private readonly highlightedHtmlGenerator: HighlightedHtmlGenerator
  ) {
  }

  async execute(tokens: Token[], userId: number): Promise<SearchMatch[]> {
    if (tokens.length === 0) {
      return [];
    }

    const parsedQuery = new QueryParser(tokens).parseQuery();
    const sqlQuery = new SearchQuerySqlBuilder(parsedQuery, userId).get();
    const searchResult = await this.prisma.$queryRawUnsafe<SearchQueryRow[]>(sqlQuery.sql, ...sqlQuery.params);

    const searchMatches: SearchMatch[] = [];
    for (const searchQueryRow of searchResult) {
      searchMatches.push(this.transformToSearchMatches(parsedQuery, searchQueryRow));
    }
    return searchMatches;
  }

  private transformToSearchMatches(query: Query, searchResult: SearchQueryRow): SearchMatch {
    const matchFinder = new SearchResultMatchFinder(query, searchResult.content);
    const highlightedHtmlChunks = this.highlightedHtmlGenerator.generateHtml(searchResult.content, matchFinder.matches);
    return {
      projectDisplayName: searchResult.full_name,
      urlToMatch: 'searchResult.urlToMatch',
      filePath: searchResult.file_path,
      chunks: highlightedHtmlChunks
    };
  }
}
