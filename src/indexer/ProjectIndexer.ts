import AdmZip from 'adm-zip';
import Crypto from 'node:crypto';
import Fs from 'node:fs';
import Path from 'node:path';
import { singleton } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';
import TextFileDetector from '../files/TextFileDetector';
import TmpFileManager, { TmpDir } from '../files/TmpFileManager';
import AppGitLabApiClient from '../gitlab/AppGitLabApiClient';
import { Project } from '../gitlab/GitLabApiClient';
import { logAndCaptureWarning } from '../SentrySdk';
import ProjectIndexWriter from './ProjectIndexWriter';

// FIXME: Refactor class
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
    if (project.empty_repo) {
      return;
    }

    await this.ensureRepositoryInDatabaseExists(project.id);

    const tmpDir = await this.tmpFileManager.createTmpDir();
    try {
      if (await this.wouldProjectNeedFullIndex(project)) {
        return await this.performFullIndex(project, tmpDir);
      }
      return await this.performIncrementalIndex(project, tmpDir);
    } finally {
      await tmpDir.cleanup();
    }
  }

  async wouldProjectNeedFullIndex(project: Project): Promise<boolean> {
    const storeRepository = await this.databaseClient.repository.findFirst({
      where: { projectId: project.id },
      select: { lastIndexedRef: true, defaultBranch: true }
    });

    return storeRepository == null ||
      storeRepository.lastIndexedRef == null ||
      storeRepository.defaultBranch !== project.default_branch;
  }

  private async performIncrementalIndex(project: Project, tmpDir: TmpDir): Promise<void> {
    const startOfIndexing = await this.databaseClient.fetchNow();

    await this.databaseClient.$transaction(async (transaction) => {
      const databaseRepository = await this.databaseClient.repository.findUniqueOrThrow({ where: { projectId: project.id } });
      if (databaseRepository.lastIndexedRef == null) {
        throw new Error(`Cannot incrementally index project ${project.id} – no lastIndexedRef set in database`);
      }

      const projectCompare = await this.appGitLabApiClient.compareProjectRefs(project.id, databaseRepository.lastIndexedRef, project.default_branch);
      const filesToUpdate = projectCompare.diffs.reduce((acc, diff) => [...acc, diff.old_path, diff.new_path], [] as string[]);
      if (projectCompare.compare_same_ref || filesToUpdate.length === 0) {
        return;
      }
      if (projectCompare.compare_timeout) {
        logAndCaptureWarning(`Incremental indexing fetched a timed_out compare from GitLab for project ${project.id} – falling back to full indexing`);
        return this.performFullIndex(project, tmpDir);
      }

      const indexWriter = new ProjectIndexWriter(transaction);

      const archiveZipPath = Path.join(tmpDir.path, 'archive.zip');
      await this.appGitLabApiClient.fetchProjectArchive(project.id, project.default_branch, archiveZipPath);

      const zip = new AdmZip(archiveZipPath);

      const projectRef = zip.getZipComment();
      this.assertLooksLikeGitObjectId(projectRef);

      await indexWriter.deleteRepositoryFiles(project.id, project.default_branch, filesToUpdate);

      const zipEntries = zip.getEntries();
      for (const zipEntry of zipEntries) {
        if (zipEntry.isDirectory || zipEntry.header.size > ProjectIndexer.MAX_FILE_SIZE) {
          continue;
        }

        const filePath = zipEntry.entryName.split('/').slice(1).join('/');
        if (!filesToUpdate.includes(filePath)) {
          continue;
        }

        const fileContent = zipEntry.getData();

        const isTextFile = await this.textFileDetector.isTextFile(filePath, fileContent);
        if (!isTextFile) {
          continue;
        }

        const fileSha256 = this.calculateSha256(fileContent);
        await indexWriter.createOrUpdateFile(fileSha256, fileContent.toString('utf-8'));
        await indexWriter.createOrUpdateRepositoryFile(project, filePath, fileSha256);
      }

      await indexWriter.cleanupOrphanedFiles(startOfIndexing);
      await indexWriter.createOrUpdateRepository(project, projectRef, startOfIndexing);
    });
  }

  private async performFullIndex(project: Project, tmpDir: TmpDir): Promise<void> {
    const startOfIndexing = await this.databaseClient.fetchNow();

    const archiveZipPath = Path.join(tmpDir.path, 'archive.zip');
    await this.appGitLabApiClient.fetchProjectArchive(project.id, project.default_branch, archiveZipPath);

    const zip = new AdmZip(archiveZipPath);
    const projectRef = zip.getZipComment();
    this.assertLooksLikeGitObjectId(projectRef);

    await this.databaseClient.$transaction(async (transaction) => {
      const indexWriter = new ProjectIndexWriter(transaction);

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
        await indexWriter.createOrUpdateFile(fileSha256, fileContent.toString('utf-8'));
        await indexWriter.createOrUpdateRepositoryFile(project, filePath, fileSha256);
      }

      await indexWriter.cleanupOutdatedAndOrphanedFiles(project.id, project.default_branch, startOfIndexing);
      await indexWriter.createOrUpdateRepository(project, projectRef, startOfIndexing);
    });
  }

  private async ensureRepositoryInDatabaseExists(projectId: number): Promise<void> {
    await this.databaseClient.repository.upsert({
      where: { projectId },
      create: { projectId, defaultBranch: '', fullName: '', displayName: '', projectUrl: '' },
      update: {}
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
