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

  async indexProject(projectId: number): Promise<void> {
    const project = await this.fetchProject(projectId);
    return this.performFullIndex(project);
  }

  private async performFullIndex(project: Project): Promise<void> {
    const startOfIndexing = await this.databaseClient.fetchNow();

    await this.databaseClient.$transaction(async (transaction) => {
      const indexWriter = new ProjectIndexWriter(transaction);

      const tmpDir = await this.tmpFileManager.createTmpDir();
      const archiveZipPath = Path.join(tmpDir.path, 'archive.zip');
      await this.appGitLabApiClient.fetchProjectArchive(project.id, project.default_branch, archiveZipPath);

      const zip = new AdmZip(archiveZipPath);
      const projectRef = zip.getZipComment();
      this.assertLooksLikeGitObjectId(projectRef);

      await indexWriter.createOrUpdateRepository(project, projectRef, startOfIndexing);

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

  private async fetchProject(projectId: number): Promise<Project> {
    const project = await this.appGitLabApiClient.fetchProject(projectId);
    if (project == null) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    return project;
  }

  private calculateSha256(file: Buffer): Buffer {
    return Crypto.createHash('sha256')
      .update(file)
      .digest();
  }

  private assertLooksLikeGitObjectId(ref: string): void {
    if (!/^[0-9a-f]{40}$/.test(ref)) {
      throw new Error(`Invalid Git object ID: ${ref}`);
    }
  }
}
