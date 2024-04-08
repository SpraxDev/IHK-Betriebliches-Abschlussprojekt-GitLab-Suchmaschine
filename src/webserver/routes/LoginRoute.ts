import { FastifyInstance } from 'fastify';
import { injectable } from 'tsyringe';
import DatabaseClient from '../../database/DatabaseClient';
import { RoleAccessLevel } from '../../indexer/gitlab/GitLabApiClient';
import UserGitLabApiClient from '../../indexer/gitlab/UserGitLabApiClient';
import OAuthAuthenticator from '../../login/OAuthAuthenticator';
import UserPermissionWriter from '../../login/UserPermissionWriter';
import FastifyWebServer from '../FastifyWebServer';

@injectable()
export default class LoginRoute {
  constructor(
    private readonly oAuthAuthenticator: OAuthAuthenticator,
    private readonly databaseClient: DatabaseClient
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
            reply
              .status(400)
              .type('text/plain; charset=utf-8')
              .send(`${error} – ${errorDescription}`);
            return;
          }

          if (code === '') {
            reply.redirect(this.oAuthAuthenticator.getAuthorizeUrl());
            return;
          }

          const exchangeResult = await this.oAuthAuthenticator.exchangeCode(code);
          if (exchangeResult == null) {
            reply.redirect(this.oAuthAuthenticator.getAuthorizeUrl());
            return;
          }

          const userGitLabApiClient = UserGitLabApiClient.create(exchangeResult.access_token, exchangeResult.refresh_token);
          const gitlabUser = await userGitLabApiClient.fetchUser();

          const projectsWithReadAccess: number[] = [];
          let projects = await userGitLabApiClient.fetchProjectList([]);
          while (true) {
            for (let project of projects.getItems()) {
              const accessLevel = project.permissions?.project_access?.access_level ?? RoleAccessLevel.NO_ACCESS;
              if ((gitlabUser.external && accessLevel >= RoleAccessLevel.REPORTER) ||
                (!gitlabUser.external && accessLevel >= RoleAccessLevel.GUEST)) {
                projectsWithReadAccess.push(project.id);
              }
            }

            if (!projects.hasNextPage()) {
              break;
            }
            projects = await projects.fetchNext();
          }

          await this.databaseClient.$transaction(async (transaction) => {
            const userPermissionWriter = new UserPermissionWriter(transaction);

            await userPermissionWriter.updateUser(exchangeResult.userId);
            await userPermissionWriter.setRepositoriesWithReadAccess(exchangeResult.userId, projectsWithReadAccess);
          });

          await request.session.regenerate();
          request.session.set('userId', gitlabUser.id);
          request.session.set('displayName', gitlabUser.name);
          request.session.set('gitLabAccessToken', exchangeResult.access_token);
          request.session.set('gitLabRefreshToken', exchangeResult.refresh_token);
          await request.session.save();

          reply.redirect('/');
        }
      });
    });
  }
}
