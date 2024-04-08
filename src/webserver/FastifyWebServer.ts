import FastifyCookie from '@fastify/cookie';
import FastifySession from '@fastify/session';
import Fastify, { type FastifyError, FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { singleton } from 'tsyringe';
import AppConfiguration from '../config/AppConfiguration';
import LoginRoute from './routes/LoginRoute';
import LogoutRoute from './routes/LogoutRoute';
import SearchRoute from './routes/SearchRoute';

declare module 'fastify' {
  interface Session {
    userId: number;
    displayName: string;
    gitLabAccessToken: string;
    gitLabRefreshToken: string;
  }
}

@singleton()
export default class FastifyWebServer {
  private readonly fastify: FastifyInstance;

  constructor(
    appConfig: AppConfiguration,
    searchRoute: SearchRoute,
    loginRoute: LoginRoute,
    logoutRoute: LogoutRoute
  ) {
    this.fastify = Fastify({
      ignoreDuplicateSlashes: true,
      ignoreTrailingSlash: true,

      trustProxy: false // TODO
    });

    this.fastify.register(FastifyCookie);
    this.fastify.register(FastifySession, { secret: appConfig.config.sessionSecret });

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

    this.setupRoutes(searchRoute, loginRoute, logoutRoute);
  }

  async listen(host: string, port: number): Promise<void> {
    await this.fastify.listen({ host, port });
  }

  async shutdown(): Promise<void> {
    await this.fastify.close();
  }

  private setupRoutes(searchRoute: SearchRoute, loginRoute: LoginRoute, logoutRoute: LogoutRoute): void {
    searchRoute.register(this.fastify);
    loginRoute.register(this.fastify);
    logoutRoute.register(this.fastify);

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

  static extractQueryParam(request: FastifyRequest, key: string): string {
    const value = (request.query as any)[key];
    if (value != null && typeof value !== 'string') {
      // TODO: BadRequestError to not send Error 500
      throw new Error('Invalid value for query parameter ' + JSON.stringify(key));
    }
    return value ?? '';
  }
}
