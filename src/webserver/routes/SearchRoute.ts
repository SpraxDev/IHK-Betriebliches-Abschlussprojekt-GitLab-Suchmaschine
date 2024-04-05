import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import QueryParser from '../../search_query/parser/QueryParser';
import QueryTokenizer from '../../search_query/parser/QueryTokenizer';
import FastifyWebServer from '../FastifyWebServer';
import SearchView from '../rendering/views/SearchView';

@injectable()
export default class SearchRoute {
  constructor(
    private readonly searchView: SearchView,
    private readonly queryTokenizer: QueryTokenizer
  ) {
  }

  register(server: FastifyInstance): void {
    server.all<{ Querystring: { q?: unknown } }>('/search', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: async (): Promise<void> => {
          const queryUserInput = request.query.q;
          if (queryUserInput != null && typeof queryUserInput !== 'string') {
            reply
              .code(400)
              .send('Invalid value for query parameter "q"');
            return;
          }

          const queryTokens = this.queryTokenizer.tokenize(queryUserInput || '');
//          const parsedQuery = new QueryParser(queryTokens).parseQuery();

          return this.searchView.reply(reply, {
            queryUserInput: queryUserInput || '',
            tokenizedQuery: queryTokens,
            results: []
          });
        }
      });
    });
  }
}
