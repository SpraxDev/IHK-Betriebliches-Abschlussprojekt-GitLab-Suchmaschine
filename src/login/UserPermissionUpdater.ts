import { singleton } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';
import { RoleAccessLevel } from '../gitlab/GitLabApiClient';
import UserGitLabApiClient from '../gitlab/UserGitLabApiClient';
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

    const projectsWithReadAccess: number[] = [];

    const minAccessLevel = gitlabUser.external ? RoleAccessLevel.REPORTER : RoleAccessLevel.GUEST;
    let projects = await userGitLabApiClient.fetchProjects({ min_access_level: minAccessLevel });
    do {
      projectsWithReadAccess.push(...projects.getItems().map(project => project.id));

      if (projects.hasNextPage()) {
        projects = await projects.fetchNext();
      }
    } while (projects.hasNextPage());

    await this.databaseClient.$transaction(async (transaction) => {
      const userPermissionWriter = new UserPermissionWriter(transaction);

      await userPermissionWriter.updateUser(userId);
      await userPermissionWriter.setRepositoriesWithReadAccess(userId, projectsWithReadAccess);
    });
  }
}
