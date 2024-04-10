import { HttpClient, HttpResponse } from '@spraxdev/node-commons';
import Fs from 'node:fs';
import { getAppInfo } from '../../constants';
import Paginated from './Paginated';

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

export enum RoleAccessLevel {
  NO_ACCESS = 0,
  MINIMAL_ACCESS = 5,
  GUEST = 10,
  REPORTER = 20,
  DEVELOPER = 30,
  MAINTAINER = 40,
  OWNER = 50
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
  permissions: {
    project_access: { access_level: number, notification_level: number } | null;
  };
}

export interface Commit {
  id: string;
  short_id: string;
  title: string;
  author_name: string;
  author_email: string;
  created_at: string;
}

export interface CompareDiff {
  old_path: string;
  new_path: string;
  a_mode: string | null;
  b_mode: string | null;
  diff: string | '';
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface ProjectCompare {
  commit: Commit;
  commits: Commit[];
  diffs: CompareDiff[];
  compare_timeout: boolean;
  compare_same_ref: boolean;
  web_url: string;
}

export default class GitLabApiClient {
  protected readonly apiBaseUrl: string;
  protected apiToken: string;

  private readonly httpClient: HttpClient;

  constructor(gitlabBaseUrl: string, apiToken: string) {
    this.apiBaseUrl = `${gitlabBaseUrl}/api/v4`;
    this.apiToken = apiToken;

    const appInfo = getAppInfo();
    this.httpClient = new HttpClient(HttpClient.generateUserAgent(appInfo.name, appInfo.version, true, appInfo.homepage));
  }

  fetchProjects(topic?: string): Promise<Paginated<Project>> {
    return this.authorizedPaginatedGet<Project>(`${this.apiBaseUrl}/projects`, {
      topic,
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

  async compareProjectRefs(projectId: number, from: string, to: string): Promise<ProjectCompare> {
    const apiRequest = await this.authorizedGet(`${this.apiBaseUrl}/projects/${projectId}/repository/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (!apiRequest.ok) {
      throw new Error(`Failed to fetch project compare for ID ${projectId} and refs {from}..{to} (Status ${apiRequest.status})`);
    }

    return JSON.parse(apiRequest.body.toString('utf-8'));
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

    return this.httpClient.get(url, { Authorization: `Bearer ${this.apiToken}` });
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
}
