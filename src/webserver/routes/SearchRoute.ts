import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import QueryTokenizer from '../../search_query/parser/QueryTokenizer';
import SearchQueryExecutor from '../../search_query/SearchQueryExecutor';
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
          const userId = request.session.get('userId');
          if (userId == null) {
            // TODO: Redirect to '/' instead and show a message that the user needs to log in with a button
            return reply.redirect('/login');
          }

          const queryUserInput = FastifyWebServer.extractQueryParam(request, 'q');
          const queryTokens = this.queryTokenizer.tokenize(queryUserInput);
          const searchResults = await this.searchQueryExecutor.execute(queryTokens, userId);

          return this.searchView.reply(reply, {
            queryUserInput: queryUserInput,
            tokenizedQuery: queryTokens,
            results: searchResults
          });
        }
      });
    });
  }
}
