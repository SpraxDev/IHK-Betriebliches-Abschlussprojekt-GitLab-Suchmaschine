import FastifyCookie from '@fastify/cookie';
import FastifySession from '@fastify/session';
import Fastify, { type FastifyError, FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { singleton } from 'tsyringe';
import AppConfiguration from '../config/AppConfiguration';
import { logAndCaptureError, setupSentryFastifyIntegration } from '../SentrySdk';
import LoginRoute from './routes/LoginRoute';
import LogoutRoute from './routes/LogoutRoute';
import SearchRoute from './routes/SearchRoute';
import SessionPrismaStore from './SessionPrismaStore';

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
    sessionPrismaStore: SessionPrismaStore,
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
    this.fastify.register(FastifySession, {
      secret: appConfig.config.sessionSecret,
      cookie: {
        httpOnly: true,
        secure: appConfig.config.appBaseUrl.startsWith('https://'),
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 /* 30d */
      },
      saveUninitialized: false,
      store: sessionPrismaStore
    });

    this.fastify.setNotFoundHandler((_request, reply) => {
      return reply
        .code(404)
        .send('Not Found');
    });
    this.fastify.setErrorHandler((err: FastifyError, _req: FastifyRequest, reply: FastifyReply) => {
      logAndCaptureError(err);

      return reply
        .code(500)
        .send('Internal Server Error');
    });
    setupSentryFastifyIntegration(this.fastify);

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
        get: async () => {
          await reply.redirect(302, '/search');
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
    await reply.status(405);
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
