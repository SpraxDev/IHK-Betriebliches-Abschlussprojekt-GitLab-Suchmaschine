import QueryParser from '../../../src/search_query/parser/QueryParser';
import QueryTokenizer from '../../../src/search_query/parser/QueryTokenizer';
import SearchResultMatchFinder, { Match } from '../../../src/search_query/result_highlighter/SearchResultMatchFinder';

describe('', () => {
  test('', () => {
    const tokens = new QueryTokenizer().tokenize('/a (hello|woRld)/');
    const query = new QueryParser(tokens).parseQuery();

    const content = 'Greetings and a Hello to the Worlds out there: Hello World!';
    const matches = new SearchResultMatchFinder(query, content).matches;

    console.log(matches);
    console.log(wrapMatchesWithAsterisks(content, matches));
  });
});

function wrapMatchesWithAsterisks(content: string, matches: Match[]): string {
  let result = '';
  let prevEnd = 0;
  for (const match of matches) {
    result += content.substring(prevEnd, match[0]);
    result += '*';
    result += content.substring(match[0], match[1]);
    result += '*';
    prevEnd = match[1];
  }
  result += content.substring(prevEnd);

  return result;
}
