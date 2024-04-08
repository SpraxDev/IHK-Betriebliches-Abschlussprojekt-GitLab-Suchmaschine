import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import FastifyWebServer from '../FastifyWebServer';

@injectable()
export default class LogoutRoute {
  register(server: FastifyInstance): void {
    server.all('/logout', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: async (): Promise<void> => {
          await request.session.destroy();
          await reply.redirect('/');
        }
      });
    });
  }
}
