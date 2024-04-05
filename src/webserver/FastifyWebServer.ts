import Fastify, { type FastifyError, FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { singleton } from 'tsyringe';

@singleton()
export default class FastifyWebServer {
  private readonly fastify: FastifyInstance;

  constructor() {
    this.fastify = Fastify({
      ignoreDuplicateSlashes: true,
      ignoreTrailingSlash: true,

      trustProxy: false // TODO
    });

    this.fastify.setNotFoundHandler((_request, reply) => {
      reply
        .code(404)
        .send('Not Found');
    });
    this.fastify.setErrorHandler((err: FastifyError, _req: FastifyRequest, reply: FastifyReply): void => {
      console.error(err);

      reply
        .code(500)
        .send('Internal Server Error');
    });
  }

  async listen(host: string, port: number): Promise<void> {
    await this.fastify.listen({ host, port });
  }

  async shutdown(): Promise<void> {
    await this.fastify.close();
  }

  private setupRoutes(searchRoute: SearchRoute): void {
    searchRoute.register(this.fastify);

    this.fastify.all('/', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: () => {
          reply.redirect(302, '/search');
        }
      });
    });
  }

  static async handleRestfully(request: FastifyRequest, reply: FastifyReply, handlers: { [key: string]: () => void | Promise<void> }): Promise<void> {
    const method = (request.method || '').toLowerCase();

    if (method in handlers) {
      await handlers[method]();
      return;
    }
    if (method == 'head' && 'get' in handlers) {
      await handlers['get']();
      return;
    }

    const allowedMethods: string[] = Object.keys(handlers);
    if (!allowedMethods.includes('head')) {
      allowedMethods.push('head');
    }

    reply.header('Allow', allowedMethods.join(', ').toUpperCase());
    reply.status(405);
  }
}