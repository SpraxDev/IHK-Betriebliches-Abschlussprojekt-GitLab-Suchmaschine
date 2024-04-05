import { FastifyInstance, FastifyRequest } from 'fastify';
import { injectable } from 'tsyringe';
import QueryTokenizer from '../../search_query/parser/QueryTokenizer';
import SearchQueryExecutor from '../../search_query/sql_builder/SearchQueryExecutor';
import FastifyWebServer from '../FastifyWebServer';
import SearchView from '../rendering/views/SearchView';

@injectable()
export default class SearchRoute {
  constructor(
    private readonly searchView: SearchView,
    private readonly queryTokenizer: QueryTokenizer,
    private readonly searchQueryExecutor: SearchQueryExecutor
  ) {
  }

  register(server: FastifyInstance): void {
    server.all('/search', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: async (): Promise<void> => {
          const queryUserInput = this.extractQueryFromRequest(request);
          const queryTokens = this.queryTokenizer.tokenize(queryUserInput);
          const searchResults = await this.searchQueryExecutor.execute(queryTokens, 1);

          return this.searchView.reply(reply, {
            queryUserInput: queryUserInput,
            tokenizedQuery: queryTokens,
            results: searchResults.map(v => ({
              projectId: v.gitlab_project_id,
              fullName: v.full_name,
              displayName: v.display_name
            }))
          });
        }
      });
    });
  }

  private extractQueryFromRequest(request: FastifyRequest): string {
    const queryUserInput = (request.query as any).q;
    if (queryUserInput != null && typeof queryUserInput !== 'string') {
      throw new Error('Invalid value for query parameter "q"');
    }
    return queryUserInput ?? '';
  }
}
