import { Prisma } from '@prisma/client';
import AdmZip from 'adm-zip';
import Crypto from 'node:crypto';
import Path from 'node:path';
import { singleton } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';
import TextFileDetector from '../files/TextFileDetector';
import TmpFileManager from '../files/TmpFileManager';
import GitLabApiClient from './gitlab/GitLabApiClient';

@singleton()
export default class GitLabProjectIndexer {
  constructor(
    private readonly gitLabApiClient: GitLabApiClient,
    private readonly tmpFileManager: TmpFileManager,
    private readonly textFileDetector: TextFileDetector,
    private readonly databaseClient: DatabaseClient
  ) {
  }

  async fullIndex(projectId: number): Promise<void> {
    const startOfIndexing = await this.databaseClient.fetchNow();

    const project = await this.gitLabApiClient.fetchProject(projectId);
    if (project == null) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    console.log(`Indexing project ${project.path_with_namespace}...`);

    await this.databaseClient.repository.upsert({
      select: { projectId: true },

      where: {
        projectId
      },
      create: {
        projectId,
        defaultBranch: project.default_branch,
        displayName: project.name,
        fullName: project.path_with_namespace
      },
      update: {
        defaultBranch: project.default_branch,
        displayName: project.name,
        fullName: project.path_with_namespace
      }
    });

    const tmpDir = await this.tmpFileManager.createTmpDir();
    const archiveZipPath = Path.join(tmpDir.path, 'archive.zip');
    await this.gitLabApiClient.fetchProjectArchive(projectId, project.default_branch, archiveZipPath);

    const zip = new AdmZip(archiveZipPath);

    const zipEntries = zip.getEntries();
    for (const zipEntry of zipEntries) {
      if (zipEntry.isDirectory) {
        continue;
      }

      const entryPath = zipEntry.entryName.split('/').slice(1).join('/');

      const entryIsTextFile = await this.textFileDetector.isTextFile(entryPath, () => zipEntry.getData());
      if (!entryIsTextFile) {
        continue;
      }

      const entryBytes = zipEntry.getData();
      const entrySha256 = Crypto.createHash('sha256')
        .update(entryBytes)
        .digest();

      await this.databaseClient.file.upsert({
        select: { sha256: true },

        where: {
          sha256: entrySha256
        },
        create: {
          sha256: entrySha256,
          content: entryBytes.toString('utf-8')
        },
        update: {}
      });
      await this.databaseClient.repositoryFiles.upsert({
        select: { projectId: true },

        where: {
          projectId_filePath_branch: {
            projectId,
            filePath: entryPath,
            branch: project.default_branch
          }
        },
        create: {
          repository: { connect: { projectId } },
          filePath: entryPath,
          branch: project.default_branch,
          file: { connect: { sha256: entrySha256 } }
        },
        update: {
          file: { connect: { sha256: entrySha256 } }
        }
      });
    }

    await this.databaseClient.$transaction([
      // delete all files not part of the currently indexed branch
      this.databaseClient.repositoryFiles.deleteMany({
        where: {
          repository: { projectId },
          OR: [
            { branch: { not: project.default_branch } },
            { updatedAt: { lt: startOfIndexing } }
          ]
        }
      }),
      this.createQueryToDeleteOrphanedFiles()
    ]);
  }

  private createQueryToDeleteOrphanedFiles(): Prisma.PrismaPromise<Prisma.BatchPayload> {
    // TODO: only delete files not added before this indexing job started
    return this.databaseClient.file.deleteMany({
      where: {
        repositoryFiles: {
          none: {}
        }
      }
    });
  }
}
