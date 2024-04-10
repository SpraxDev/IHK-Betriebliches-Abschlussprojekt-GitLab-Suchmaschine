import { singleton } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';
import QueryParser, { Query } from './parser/QueryParser';
import { Token } from './parser/QueryTokenizer';
import HighlightedHtmlGenerator, { HighlightedHtmlChunk } from './result_highlighter/HighlightedHtmlGenerator';
import SearchResultMatchFinder from './result_highlighter/SearchResultMatchFinder';
import SearchQuerySqlBuilder, { SearchQueryRow } from './sql_builder/SearchQuerySqlBuilder';

export type SearchMatch = {
  projectGitLabUrl: string;
  projectGitLabAvatarUrl: string | null;
  projectGitLabFileUrl: string;
  projectFullPath: string;
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
      projectGitLabUrl: searchResult.project_url,
      projectGitLabAvatarUrl: searchResult.avatar_url,
      projectGitLabFileUrl: `${searchResult.project_url}/-/blob/${searchResult.default_branch}/${searchResult.file_path}?ref_type=heads`, // FIXME: encode file_path individually (so file name with a question mark is properly encoded)
      projectFullPath: searchResult.full_name,
      filePath: searchResult.file_path,
      chunks: highlightedHtmlChunks
    };
  }
}
