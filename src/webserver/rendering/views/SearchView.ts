import { singleton } from 'tsyringe';
import { Token } from '../../../search_query/parser/QueryTokenizer';
import { HighlightedHtmlChunk } from '../../../search_query/result_highlighter/HighlightedHtmlGenerator';
import ViewRenderer from '../ViewRenderer';
import AbstractView from './AbstractView';

export type SearchTemplateData = {
  queryUserInput: string;
  tokenizedQuery: Token[];
  results: {
    projectDisplayName: string;
    urlToMatch: string;
    filePath: string;
    chunks: HighlightedHtmlChunk[];
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
