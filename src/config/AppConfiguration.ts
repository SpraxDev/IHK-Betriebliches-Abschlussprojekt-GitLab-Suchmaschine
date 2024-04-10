import { singleton } from 'tsyringe';

export type AppConfig = {
  readonly sentryDsn: string;
  readonly sessionSecret: string;

  readonly gitlab: {
    readonly apiUrl: string;  // TODO: rename into baseUrl
    readonly apiToken: string;
    readonly clientId: string;
    readonly clientSecret: string;
  }

  readonly projectsToIndex: {
    readonly topics: string[];
  }
};

@singleton()
export default class AppConfiguration {
  public readonly config: AppConfig;

  constructor() {
    this.config = this.deepFreeze({
      sentryDsn: this.getAndRemoveEnvVar('SENTRY_DSN') ?? '',
      sessionSecret: this.getAndRemoveEnvVar('SESSION_SECRET') ?? '',

      gitlab: {
        apiUrl: this.parseGitLabBaseUrl(),
        apiToken: this.getAndRemoveEnvVar('GITLAB_API_TOKEN') ?? '',
        clientId: this.getAndRemoveEnvVar('GITLAB_CLIENT_ID') ?? '',
        clientSecret: this.getAndRemoveEnvVar('GITLAB_CLIENT_SECRET') ?? ''
      },

      projectsToIndex: {
        topics: this.parseProjectTopicsToIndex()
      }
    } satisfies AppConfig);
  }

  private parseGitLabBaseUrl(): string {
    const baseUrl = this.getAndRemoveEnvVar('GITLAB_BASE_URL');
    if (baseUrl == null) {
      return '';
    }

    if (baseUrl.endsWith('/')) {
      return baseUrl.slice(0, -1);
    }
    return baseUrl;
  }

  private parseProjectTopicsToIndex(): string[] {
    const topics = this.getAndRemoveEnvVar('INDEX_PROJECT_TOPICS');
    if (topics == null) {
      return ['searchable'];
    }

    return topics
      .split(',')
      .filter(topic => topic.length > 0);
  }

  private getAndRemoveEnvVar(name: string): string | undefined {
    const value = process.env[name];
    delete process.env[name];
    return value;
  }

  private deepFreeze(obj: any): any {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object') {
        this.deepFreeze(obj[key]);
      }
    }
    return Object.freeze(obj);
  }
}
