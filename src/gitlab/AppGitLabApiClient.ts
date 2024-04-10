import { singleton } from 'tsyringe';
import AppConfiguration from '../config/AppConfiguration';
import GitLabApiClient from './GitLabApiClient';

@singleton()
export default class AppGitLabApiClient extends GitLabApiClient {
  constructor(appConfig: AppConfiguration) {
    super(appConfig.config.gitlab.apiUrl, appConfig.config.gitlab.apiToken);
  }
}
