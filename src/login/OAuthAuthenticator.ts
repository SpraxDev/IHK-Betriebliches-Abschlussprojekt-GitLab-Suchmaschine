import { HttpClient } from '@spraxdev/node-commons';
import { singleton } from 'tsyringe';
import AppConfiguration from '../config/AppConfiguration';
import { getAppInfo } from '../constants';

export type CodeExchangeResponse = {
  token_type: 'Bearer';
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token: string;
}

@singleton()
export default class OAuthAuthenticator {
  private readonly httpClient: HttpClient;

  constructor(
    private readonly appConfig: AppConfiguration
  ) {
    const appInfo = getAppInfo();
    this.httpClient = new HttpClient(HttpClient.generateUserAgent(appInfo.name, appInfo.version, true, appInfo.homepage));
  }

  public getAuthorizeUrl(): string {
    return `${this.appConfig.config.gitlab.apiUrl}/oauth/authorize?client_id=${this.appConfig.config.gitlab.clientId}&redirect_uri=${encodeURIComponent(this.getRedirectUri())}&response_type=code&scope=openid read_api`;
  }

  public getRedirectUri(): string {
    return `${this.appConfig.config.appBaseUrl}/login`;
  }

  async exchangeCode(code: string): Promise<(CodeExchangeResponse & { userId: number, displayName: string })> {
    const response = await this.httpClient.post(`${this.appConfig.config.gitlab.apiUrl}/oauth/token`, undefined, {
      client_id: this.appConfig.config.gitlab.clientId,
      client_secret: this.appConfig.config.gitlab.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.getRedirectUri(),
      code
    });
    const responseBody = JSON.parse(response.body.toString('utf-8'));

    if (response.statusCode === 200) {
      this.assertCodeExchangeResponse(responseBody);
      return {
        ...responseBody,
        ...this.extractDataFromIdToken(responseBody.id_token)
      };
    }

    if (response.badRequest) {
      // FIXME: Send BadRequest to user-agent
      throw new Error(`Failed to exchange code (Status ${response.statusCode}): ${responseBody.error} – ${responseBody.error_description}`);
    }
    throw new Error(`Failed to exchange code (Status ${response.statusCode}): ${JSON.stringify(responseBody)}`);
  }

  private extractDataFromIdToken(idToken: string): { userId: number, displayName: string } {
    const jwtData = idToken.split('.')[1];
    const decodedData = Buffer.from(jwtData, 'base64').toString('utf-8');
    const data = JSON.parse(decodedData);

    const displayName = data.name;
    if (typeof displayName !== 'string') {
      throw new Error('Unable to extract "name" from id_token');
    }
    const id = parseInt(data.sub, 10);
    if (!Number.isSafeInteger(id)) {
      throw new Error('Unable to extract "sub" as "id" from id_token');
    }
    return { userId: id, displayName };
  }

  private assertCodeExchangeResponse(obj: any): asserts obj is CodeExchangeResponse {
    if (obj.token_type !== 'Bearer' ||
      typeof obj.access_token !== 'string' ||
      typeof obj.refresh_token !== 'string' ||
      typeof obj.id_token !== 'string' ||
      typeof obj.expires_in !== 'number') {
      throw new Error('Invalid CodeExchangeResponse');
    }
  }
}
