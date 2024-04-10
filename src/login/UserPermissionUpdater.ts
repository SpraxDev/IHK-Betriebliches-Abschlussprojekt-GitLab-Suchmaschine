import { singleton } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';
import { RoleAccessLevel } from '../indexer/gitlab/GitLabApiClient';
import UserGitLabApiClient from '../indexer/gitlab/UserGitLabApiClient';
import UserPermissionWriter from './UserPermissionWriter';

@singleton()
export default class UserPermissionUpdater {
  constructor(
    private readonly databaseClient: DatabaseClient
  ) {
  }

  async update(userId: number, accessToken: string, refreshToken: string): Promise<void> {
    const userGitLabApiClient = UserGitLabApiClient.create(accessToken, refreshToken);
    const gitlabUser = await userGitLabApiClient.fetchUser();

    // FIXME: Der Project-List Endpunkt kann nach `min_access_level` filtern - Stattdessen das benutzen
    const projectsWithReadAccess: number[] = [];
    let projects = await userGitLabApiClient.fetchProjects();
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

      await userPermissionWriter.updateUser(userId);
      await userPermissionWriter.setRepositoriesWithReadAccess(userId, projectsWithReadAccess);
    });
  }
}
