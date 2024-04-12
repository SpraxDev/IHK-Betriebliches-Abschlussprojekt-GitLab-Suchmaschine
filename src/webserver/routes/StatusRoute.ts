import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import FastifyWebServer from '../FastifyWebServer';

@injectable()
export default class StatusRoute {
  register(server: FastifyInstance): void {
    server.all('/status', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: async (): Promise<void> => await reply.send({ status: 'ok' })
      });
    });
  }
}
