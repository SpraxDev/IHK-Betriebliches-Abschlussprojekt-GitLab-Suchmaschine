import { singleton } from 'tsyringe';

export type AppConfig = {
  readonly sessionSecret: string;

  readonly gitlab: {
    readonly apiUrl: string;  // TODO: rename into baseUrl
    readonly apiToken: string;
    readonly clientId: string;
    readonly clientSecret: string;
  }
};

@singleton()
export default class AppConfiguration {
  public readonly config: AppConfig;

  constructor() {
    this.config = this.deepFreeze({
      sessionSecret: process.env.SESSION_SECRET ?? '',

      gitlab: {
        apiUrl: this.parseGitLabBaseUrl(),
        apiToken: process.env.GITLAB_API_TOKEN ?? '',
        clientId: process.env.GITLAB_CLIENT_ID ?? '',
        clientSecret: process.env.GITLAB_CLIENT_SECRET ?? ''
      }
    } satisfies AppConfig);
  }

  private parseGitLabBaseUrl(): string {
    const baseUrl = process.env.GITLAB_BASE_URL;
    if (baseUrl == null) {
      return '';
    }

    if (baseUrl.endsWith('/')) {
      return baseUrl.slice(0, -1);
    }
    return baseUrl;
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
