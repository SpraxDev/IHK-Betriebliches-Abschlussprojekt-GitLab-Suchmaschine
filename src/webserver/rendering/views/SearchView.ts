import { singleton } from 'tsyringe';
import { Token } from '../../../search_query/parser/QueryTokenizer';
import ViewRenderer from '../ViewRenderer';
import AbstractView from './AbstractView';

export type SearchTemplateData = {
  queryUserInput: string;
  tokenizedQuery: Token[];
  results: {
    projectGitLabUrl: string;
    projectGitLabAvatarUrl: string | null;
    projectGitLabFileUrl: string;
    projectFullPath: string;
    filePath: string;
    chunks: {
      firstLineNumber: number;
      html: string;
    }[];
  }[];
};

@singleton()
export default class SearchView extends AbstractView<SearchTemplateData> {
  constructor(viewRenderer: ViewRenderer) {
    super(viewRenderer);
  }

  get templateFile(): string {
    return 'search';
  }
}
