import AdmZip from 'adm-zip';
import Crypto from 'node:crypto';
import Path from 'node:path';
import { singleton } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';
import TextFileDetector from '../files/TextFileDetector';
import TmpFileManager from '../files/TmpFileManager';
import AppGitLabApiClient from './gitlab/AppGitLabApiClient';
import { Project } from './gitlab/GitLabApiClient';
import ProjectIndexWriter from './ProjectIndexWriter';

@singleton()
export default class ProjectIndexer {
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024;

  constructor(
    private readonly appGitLabApiClient: AppGitLabApiClient,
    private readonly tmpFileManager: TmpFileManager,
    private readonly textFileDetector: TextFileDetector,
    private readonly databaseClient: DatabaseClient
  ) {
  }

  async fullIndex(projectId: number): Promise<void> {
    const project = await this.appGitLabApiClient.fetchProject(projectId);
    if (project == null) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    console.log(`Indexing project ${project.path_with_namespace}...`);
    await this.performFullIndex(project);
  }

  private async performFullIndex(project: Project): Promise<void> {
    const startOfIndexing = await this.databaseClient.fetchNow();

    await this.databaseClient.$transaction(async (transaction) => {
      const indexWriter = new ProjectIndexWriter(transaction);

      await indexWriter.createOrUpdateRepository(project);

      const tmpDir = await this.tmpFileManager.createTmpDir();
      const archiveZipPath = Path.join(tmpDir.path, 'archive.zip');
      await this.appGitLabApiClient.fetchProjectArchive(project.id, project.default_branch, archiveZipPath);

      const zip = new AdmZip(archiveZipPath);

      const zipEntries = zip.getEntries();
      for (const zipEntry of zipEntries) {
        if (zipEntry.isDirectory || zipEntry.header.size > ProjectIndexer.MAX_FILE_SIZE) {
          continue;
        }

        const filePath = zipEntry.entryName.split('/').slice(1).join('/');
        const fileContent = zipEntry.getData();

        const isTextFile = await this.textFileDetector.isTextFile(filePath, fileContent);
        if (!isTextFile) {
          continue;
        }

        const fileSha256 = this.calculateSha256(fileContent);
        await indexWriter.createOrUpdateFile(fileContent, fileSha256);
        await indexWriter.createOrUpdateRepositoryFile(project, filePath, fileSha256);
      }

      await indexWriter.cleanupOutdatedAndOrphanedFiles(project.id, project.default_branch, startOfIndexing);
    });
  }

  private calculateSha256(file: Buffer): Buffer {
    return Crypto.createHash('sha256')
      .update(file)
      .digest();
  }
}
