import { Prisma, PrismaClient } from '@prisma/client';
import { ITXClientDenyList } from '@prisma/client/runtime/binary';
import { Project } from './gitlab/GitLabApiClient';

export default class ProjectIndexWriter {
  private readonly transaction: Omit<PrismaClient, ITXClientDenyList>;

  constructor(transaction: Omit<PrismaClient, ITXClientDenyList>) {
    this.transaction = transaction;
  }

  async createOrUpdateRepository(project: Project): Promise<void> {
    await this.transaction.repository.upsert({
      select: { projectId: true },

      where: {
        projectId: project.id
      },
      create: {
        projectId: project.id,
        defaultBranch: project.default_branch,
        displayName: project.name,
        fullName: project.path_with_namespace, // TODO: rename fullName to fullPath
        projectUrl: project.web_url,
        avatarUrl: project.avatar_url
      },
      update: {
        defaultBranch: project.default_branch,
        displayName: project.name,
        fullName: project.path_with_namespace,
        projectUrl: project.web_url,
        avatarUrl: project.avatar_url
      }
    });
  }

  async createOrUpdateFile(fileContent: Buffer, fileSha256: Buffer): Promise<void> {
    await this.transaction.file.upsert({
      select: { sha256: true },

      where: {
        sha256: fileSha256
      },
      create: {
        sha256: fileSha256,
        content: fileContent.toString('utf-8')
      },
      update: {}
    });
  }

  async createOrUpdateRepositoryFile(project: Project, filePath: string, fileSha256: Buffer): Promise<void> {
    await this.transaction.repositoryFiles.upsert({
      select: { projectId: true },

      where: {
        projectId_filePath_branch: {
          projectId: project.id,
          filePath,
          branch: project.default_branch
        }
      },
      create: {
        repository: { connect: { projectId: project.id } },
        filePath,
        branch: project.default_branch,
        file: { connect: { sha256: fileSha256 } }
      },
      update: {
        file: { connect: { sha256: fileSha256 } }
      }
    });
  }

  async cleanupOutdatedAndOrphanedFiles(projectId: number, defaultBranch: string, startOfIndexing: Date): Promise<void> {
    await this.createQueryToDeleteOutdatedRepositoryFiles(projectId, defaultBranch, startOfIndexing);
    await this.createQueryToDeleteOrphanedFiles(startOfIndexing);
  }

  private createQueryToDeleteOutdatedRepositoryFiles(projectId: number, defaultBranch: string, startOfIndexing: Date): Prisma.PrismaPromise<Prisma.BatchPayload> {
    return this.transaction.repositoryFiles.deleteMany({
      where: {
        repository: { projectId },
        OR: [
          { branch: { not: defaultBranch } },
          { updatedAt: { lt: startOfIndexing } }
        ]
      }
    });
  }

  private createQueryToDeleteOrphanedFiles(startOfIndexing: Date): Prisma.PrismaPromise<Prisma.BatchPayload> {
    return this.transaction.file.deleteMany({
      where: {
        repositoryFiles: {
          none: {}
        },
        createdAt: {
          lt: startOfIndexing
        }
      }
    });
  }
}
