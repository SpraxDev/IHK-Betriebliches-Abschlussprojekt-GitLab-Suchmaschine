import { PrismaClient } from '@prisma/client';
import { ITXClientDenyList } from '@prisma/client/runtime/binary';

export default class UserPermissionWriter {
  private readonly transaction: Omit<PrismaClient, ITXClientDenyList>;

  constructor(transaction: Omit<PrismaClient, ITXClientDenyList>) {
    this.transaction = transaction;
  }

  async updateUser(userId: number): Promise<void> {
    await this.transaction.user.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
  }

  async setRepositoriesWithReadAccess(userId: number, projectIds: number[]): Promise<void> {
    await this.removeAllRepositoryAssociations(userId);
    await this.addOrCreateRepositoryAssociation(userId, projectIds);
  }

  private async removeAllRepositoryAssociations(userId: number): Promise<void> {
    await this.transaction.user.update({
      where: { userId },
      data: {
        repositoriesWithReadAccess: {
          set: []
        }
      }
    });
  }

  private async addOrCreateRepositoryAssociation(userId: number, projectIds: number[]): Promise<void> {
    await this.transaction.user.update({
      where: { userId },
      data: {
        repositoriesWithReadAccess: {
          connectOrCreate: projectIds.map((projectId) => ({
            where: { projectId },
            create: { projectId, defaultBranch: '', fullName: '', displayName: '' }
          }))
        }
      }
    });
  }
}
