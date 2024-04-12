import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import OAuthAuthenticator from '../../login/OAuthAuthenticator';
import UserPermissionUpdater from '../../login/UserPermissionUpdater';
import FastifyWebServer from '../FastifyWebServer';

@injectable()
export default class LoginRoute {
  constructor(
    private readonly oAuthAuthenticator: OAuthAuthenticator,
    private readonly userPermissionUpdater: UserPermissionUpdater
  ) {
  }

  register(server: FastifyInstance): void {
    server.all('/login', (request, reply): Promise<void> => {
      return FastifyWebServer.handleRestfully(request, reply, {
        get: async (): Promise<void> => {
          const code = FastifyWebServer.extractQueryParam(request, 'code');
          const error = FastifyWebServer.extractQueryParam(request, 'error');

          if (error !== '') {
            const errorDescription = FastifyWebServer.extractQueryParam(request, 'error_description');
            await reply
              .status(400)
              .type('text/plain; charset=utf-8')
              .send(`${error} – ${errorDescription}`);
            return;
          }

          if (code === '') {
            await reply.redirect(this.oAuthAuthenticator.getAuthorizeUrl());
            return;
          }

          const exchangeResult = await this.oAuthAuthenticator.exchangeCode(code);
          await this.userPermissionUpdater.update(exchangeResult.userId, exchangeResult.access_token, exchangeResult.refresh_token);

          // FIXME: delete old session from database (https://github.com/fastify/session/issues/240)
          await request.session.regenerate();
          request.session.set('userId', exchangeResult.userId);
          request.session.set('displayName', exchangeResult.displayName);
          request.session.set('gitLabAccessToken', exchangeResult.access_token);
          request.session.set('gitLabRefreshToken', exchangeResult.refresh_token);
          await request.session.save();

          await reply.redirect('/');
        }
      });
    });
  }
}
