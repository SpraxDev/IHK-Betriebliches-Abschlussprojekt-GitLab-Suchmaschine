import { Prisma, PrismaClient } from '@prisma/client';
import { ITXClientDenyList } from '@prisma/client/runtime/binary';
import { Project } from '../gitlab/GitLabApiClient';
import UnicodeAwareStringChunker from './UnicodeAwareStringChunker';

export default class ProjectIndexWriter {
  private static readonly GIST_INDEX_MAX_BYTES = 8191;

  private readonly stringChunker = new UnicodeAwareStringChunker();
  private readonly transaction: Omit<PrismaClient, ITXClientDenyList>;

  constructor(transaction: Omit<PrismaClient, ITXClientDenyList>) {
    this.transaction = transaction;
  }

  async createOrUpdateRepository(project: Project, lastIndexedRef: string, lastIndexedAt: Date): Promise<void> {
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
        lastIndexedRef,
        lastIndexedAt,
        projectUrl: project.web_url,
        avatarUrl: project.avatar_url
      },
      update: {
        defaultBranch: project.default_branch,
        displayName: project.name,
        fullName: project.path_with_namespace,
        lastIndexedRef,
        lastIndexedAt,
        projectUrl: project.web_url,
        avatarUrl: project.avatar_url
      }
    });
  }

  async createOrUpdateFile(fileSha256: Buffer, content: string): Promise<void> {
    await this.transaction.file.upsert({
      where: { sha256: fileSha256 },
      create: { sha256: fileSha256 },
      update: {},

      select: { sha256: true }
    });

    const fileExists = await this.transaction.fileChunks.findFirst({ where: { fileSha256 } });
    if (fileExists) {
      return;
    }

    const chunkedContent = this.stringChunker.chunk(content, ProjectIndexWriter.GIST_INDEX_MAX_BYTES);
    for (let i = 0; i < chunkedContent.length; ++i) {
      const chunk = chunkedContent[i];
      await this.transaction.fileChunks.upsert({
        select: { fileSha256: true },

        where: {
          fileSha256_order: {
            fileSha256,
            order: i
          }
        },
        create: {
          fileSha256,
          order: i,
          content: chunk
        },
        update: {
          content: chunk
        }
      });
    }
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

  async deleteRepositoryFiles(projectId: number, branch: string, filePaths: string[]): Promise<void> {
    await this.transaction.repositoryFiles.deleteMany({
      where: {
        projectId,
        branch,
        filePath: { in: filePaths }
      }
    });
  }

  async cleanupOutdatedAndOrphanedFiles(projectId: number, defaultBranch: string, startOfIndexing: Date): Promise<void> {
    await this.createQueryToDeleteOutdatedRepositoryFiles(projectId, defaultBranch, startOfIndexing);
    await this.createQueryToDeleteOrphanedFiles(startOfIndexing);
  }

  async cleanupOrphanedFiles(startOfIndexing: Date): Promise<void> {
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
