import { singleton } from 'tsyringe';
import { Project } from '../gitlab/GitLabApiClient';

export type AppConfig = {
  readonly sentryDsn: string;
  readonly sessionSecret: string;
  readonly appBaseUrl: string;

  readonly gitlab: {
    readonly apiUrl: string;  // TODO: rename into baseUrl
    readonly apiToken: string;
    readonly clientId: string;
    readonly clientSecret: string;
  }

  readonly projectsToIndex: {
    readonly topics: string[];
    readonly visibilities: Project['visibility'][];
  }
};

@singleton()
export default class AppConfiguration {
  public readonly config: AppConfig;

  constructor() {
    this.config = this.deepFreeze({
      sentryDsn: this.getAndRemoveEnvVar('SENTRY_DSN') ?? '',
      sessionSecret: this.getAndRemoveEnvVar('SESSION_SECRET') ?? '',
      appBaseUrl: this.parseBaseUrl('APP_BASE_URL'),

      gitlab: {
        apiUrl: this.parseBaseUrl('GITLAB_BASE_URL'),
        apiToken: this.getAndRemoveEnvVar('GITLAB_API_TOKEN') ?? '',
        clientId: this.getAndRemoveEnvVar('GITLAB_CLIENT_ID') ?? '',
        clientSecret: this.getAndRemoveEnvVar('GITLAB_CLIENT_SECRET') ?? ''
      },

      projectsToIndex: {
        topics: this.parseProjectTopicsToIndex(),
        visibilities: this.parseProjectVisibilitiesToIndex()
      }
    } satisfies AppConfig);
  }

  private parseBaseUrl(envKey: string): string {
    const baseUrl = this.getAndRemoveEnvVar(envKey);
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
      return ['meta:searchable'];
    }

    return topics
      .split(',')
      .filter(topic => topic.length > 0);
  }

  private parseProjectVisibilitiesToIndex(): Project['visibility'][] {
    const visibilities = this.getAndRemoveEnvVar('INDEX_PROJECT_VISIBILITIES');
    if (visibilities == null) {
      return ['public'];
    }

    return visibilities
      .split(',')
      .filter(visibility => ['public', 'internal', 'private'].includes(visibility)) as Project['visibility'][];
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
