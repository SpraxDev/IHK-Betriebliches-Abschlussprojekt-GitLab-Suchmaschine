import { HttpResponse } from '@spraxdev/node-commons';
import { container } from 'tsyringe';
import AppConfiguration from '../config/AppConfiguration';
import GitLabApiClient from './GitLabApiClient';

export type GitLabUser = {
  id: number;
  username: string;
  name: string;
  state: 'active' | string;
  locked: boolean;
  avatar_url: string;
  web_url: string;
  last_activity_on: string;
  external: boolean;
};

export default class UserGitLabApiClient extends GitLabApiClient {
  private readonly refreshToken: string;
  private accessTokenChanged = false;

  constructor(gitlabBaseUrl: string, apiToken: string, refreshToken: string) {
    super(gitlabBaseUrl, apiToken);
    this.refreshToken = refreshToken;
  }

  getAccessToken(): string {
    return this.apiToken;
  }

  hasAccessTokenChanged(): boolean {
    return this.accessTokenChanged;
  }

  async fetchUser(): Promise<GitLabUser> {
    const apiRequest = await this.authorizedGet(`${this.apiBaseUrl}/user`);
    if (!apiRequest.ok) {
      throw new Error(`Failed to fetch logged in user (Status ${apiRequest.status}): ${apiRequest.body.toString('utf-8')}`);
    }

    return JSON.parse(apiRequest.body.toString('utf-8'));
  }

  static create(apiToken: string, refreshToken: string): UserGitLabApiClient {
    return new UserGitLabApiClient(container.resolve(AppConfiguration).config.gitlab.apiUrl, apiToken, refreshToken);
  }

  async authorizedGet(url: string, parameters: { [key: string]: any } = {}): Promise<HttpResponse> {
    // TODO: catch outdated token and try to refresh it automatically
    return super.authorizedGet(url, parameters);
  }
}
