import { singleton } from 'tsyringe';
import DatabaseClient from '../database/DatabaseClient';

export type AppStatistics = {
  totalKnownRepositories: number;
  totalIndexedRepositories: number;
  totalIndexedUniqueFiles: number;
};

@singleton()
export default class AppStatisticsProvider {
  constructor(
    private readonly databaseClient: DatabaseClient
  ) {
  }

  async getStatistics(): Promise<AppStatistics> {
    const totalKnownRepositories = await this.databaseClient.repository.count();
    const totalIndexedRepositories = await this.databaseClient.repository.count({ where: { lastIndexedRef: { not: null } } });
    const totalIndexedUniqueFiles = await this.databaseClient.file.count();

    return {
      totalKnownRepositories,
      totalIndexedRepositories,
      totalIndexedUniqueFiles
    };
  }
}
