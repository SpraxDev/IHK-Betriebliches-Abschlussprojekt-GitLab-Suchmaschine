import { HttpClient, HttpResponse } from '@spraxdev/node-commons';
import Fs from 'node:fs';
import { singleton } from 'tsyringe';
import AppConfiguration from '../../config/AppConfiguration';
import { getAppInfo } from '../../constants';

export interface Namespace {
  id: number;
  name: string;
  path: string;
  kind: string;
  full_path: string;
  parent_id: number | null;
  avatar_url: string;
  web_url: string;
}

export interface SimpleProject {
  id: number;
  description: string;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: string;
  default_branch: string;
  topics: string[];
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  web_url: string;
  readme_url: string;
  forks_count: number;
  avatar_url: string | null;
  star_count: number;
  last_activity_at: string;
  namespace: Namespace;
  repository_storage: string;
}

export interface Project extends SimpleProject {
  _links: { [key: string]: string };
  packages_enabled: boolean;
  empty_repo: boolean;
  archived: boolean;
  visibility: 'private' | 'internal' | 'public';
  owner: {
    id: number;
    username: string;
    name: string;
    state: string;
    locked: boolean;
    avatar_url: string;
    web_url: string;
  };
  resolve_outdated_diff_discussions: boolean;
  container_expiration_policy: unknown;
  repository_object_format: 'sha1' | string;
  issues_enabled: boolean;
  merge_requests_enabled: boolean;
  wiki_enabled: boolean;
  jobs_enabled: boolean;
  snippets_enabled: boolean;
  container_registry_enabled: boolean;
  service_desk_enabled: boolean;
  service_desk_address: string | null;
  can_create_merge_request_in: boolean;
  lfs_enabled: boolean;
  creator_id: number;
  description_html: string;
  updated_at: string;
}

@singleton()
export default class GitLabApiClient {
  private readonly apiBaseUrl: string;
  private readonly apiToken: string;

  private httpClient?: HttpClient;

  constructor(appConfig: AppConfiguration) {
    this.apiBaseUrl = `${appConfig.config.gitlab.apiUrl}/api/v4`;
    this.apiToken = appConfig.config.gitlab.apiToken;
  }

  fetchProjectList(topics: string[] = ['searchable']): Promise<Paginated<SimpleProject>> {
    return this.authorizedPaginatedGet<SimpleProject>(`${this.apiBaseUrl}/projects`, {
      simple: true,
      topic: topics.join(','),
      order_by: 'last_activity_at',
      sort: 'desc',
      per_page: 100
    });
  }

  async fetchProject(projectId: number): Promise<Project | null> {
    const apiRequest = await this.authorizedGet(`${this.apiBaseUrl}/projects/${projectId}`);

    if (apiRequest.notFound) {
      return null;
    }
    if (!apiRequest.ok) {
      throw new Error(`Failed to fetch project with ID ${projectId} (Status ${apiRequest.status})`);
    }

    return JSON.parse(apiRequest.body.toString('utf-8'));
  }

  async fetchProjectArchive(projectId: number, ref: string, targetPath: string): Promise<void> {
    // TODO: The HttpClient is not intended to be used for larger response bodies and should be replaced with an API that supports #pipe
    const apiRequest = await this.authorizedGet(`${this.apiBaseUrl}/projects/${projectId}/repository/archive.zip`, { sha: ref });
    if (!apiRequest.ok) {
      throw new Error(`Failed to fetch project archive for ID ${projectId} and ref ${ref} (Status ${apiRequest.status})`);
    }

    await Fs.promises.writeFile(targetPath, apiRequest.body);
  }

  async authorizedPaginatedGet<T>(url: string, parameters: { [key: string]: any } = {}): Promise<Paginated<T>> {
    const apiRequest = await this.authorizedGet(url, parameters);

    if (apiRequest.notFound) {
      return new Paginated<T>([]);
    }
    if (!apiRequest.ok) {
      throw new Error(`Failed to fetch paginated data from ${url} (Status ${apiRequest.status})`);
    }

    const items = JSON.parse(apiRequest.body.toString('utf-8'));
    const linkHeader = apiRequest.headers['link'];
    const links = linkHeader != null ? await this.parseLinkHeader(linkHeader) : {};
    return new Paginated(items, links['next'] != null ? () => this.authorizedPaginatedGet(links['next']) : undefined);
  }

  async authorizedGet(url: string, parameters: { [key: string]: any } = {}): Promise<HttpResponse> {
    for (const parameterKey in parameters) {
      const parameterValue = parameters[parameterKey];
      if (parameterValue == null) {
        continue;
      }

      url += url.indexOf('?') === -1 ? '?' : '&';
      url += `${encodeURIComponent(parameterKey)}=${encodeURIComponent(parameterValue)}`;
    }

    const httpClient = await this.getHttpClient();
    return httpClient.get(url, { Authorization: `Bearer ${this.apiToken}` });
  }

  private async parseLinkHeader(linkHeader: string): Promise<{ [key: string]: string }> {
    const links: { [key: string]: string } = {};
    const linkParts = linkHeader.split(',');
    for (const linkPart of linkParts) {
      const linkPartMatch = linkPart.match(/<([^>]+)>; rel="([^"]+)"/);
      if (linkPartMatch == null) {
        continue;
      }

      const linkUrl = linkPartMatch[1];
      const linkRel = linkPartMatch[2];
      links[linkRel] = linkUrl;
    }

    return links;
  }

  async getHttpClient(): Promise<HttpClient> {
    if (this.httpClient == null) {
      const appInfo = await getAppInfo();
      this.httpClient = new HttpClient(HttpClient.generateUserAgent(appInfo.name, appInfo.version, true, appInfo.homepage));
    }

    return this.httpClient;
  }
}

export class Paginated<T> {
  private readonly items: T[];
  public readonly fetchNextPage?: () => Promise<Paginated<T>>;

  constructor(items: T[], fetchNextPage?: () => Promise<Paginated<T>>) {
    this.fetchNextPage = fetchNextPage;
    this.items = items;
  }

  getItems(): T[] {
    return this.items;
  }

  fetchNext(): Promise<Paginated<T>> {
    if (this.fetchNextPage == null) {
      throw new Error('No next page available');
    }

    return this.fetchNextPage();
  }

  hasNextPage(): boolean {
    return this.fetchNext != null;
  }
}
