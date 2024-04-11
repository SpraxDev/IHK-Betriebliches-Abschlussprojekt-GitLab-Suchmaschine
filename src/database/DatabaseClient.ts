import { PrismaClient } from '@prisma/client';
import { singleton } from 'tsyringe';
import { setupSentryPrismIntegration } from '../SentrySdk';

@singleton()
export default class DatabaseClient extends PrismaClient {
  constructor() {
    super({
      transactionOptions: {
        maxWait: 10 * 1000,
        timeout: 10 * 60 * 1000
      }
    });

    setupSentryPrismIntegration(this);
  }

  /**
   * (Workaround for https://github.com/prisma/prisma/issues/5598)
   */
  async fetchNow(): Promise<Date> {
    const records = await this.$queryRaw`SELECT now() as now;`;
    if (!Array.isArray(records) || records.length != 1 || !(records[0].now instanceof Date)) {
      throw new Error('Expected array with one Date-record');
    }

    return records[0].now;
  }
}
