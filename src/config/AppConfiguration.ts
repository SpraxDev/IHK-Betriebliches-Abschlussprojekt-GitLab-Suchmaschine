import { singleton } from 'tsyringe';

export type AppConfig = {
  readonly gitlab: {
    readonly apiUrl: string;
    readonly apiToken: string;
  }
};

@singleton()
export default class AppConfiguration {
  public readonly config: AppConfig;

  constructor() {
    this.config = this.deepFreeze({
      gitlab: {
        apiUrl: this.parseGitLabBaseUrl(),
        apiToken: process.env.GITLAB_API_TOKEN ?? ''
      }
    });
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
