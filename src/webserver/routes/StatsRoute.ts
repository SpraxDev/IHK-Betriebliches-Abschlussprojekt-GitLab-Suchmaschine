import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import AppStatisticsProvider from '../../stats/AppStatisticsProvider';
import FastifyWebServer from '../FastifyWebServer';

@injectable()
export default class StatsRoute {
  constructor(private readonly appStatisticsProvider: AppStatisticsProvider) {
  }

  register(server: FastifyInstance): void {
    // TODO: Require login
    // TODO: More stats (database size on disk)
    // TODO: Caching to reduce database load and improve response times
    // TODO: Render HTML instead of JSON
    server.all('/stats', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: async (): Promise<void> => {
          const stats = await this.appStatisticsProvider.getStatistics();
          await reply.send(stats);
        }
      });
    });
  }
}
