import { And, Or, Query, Term, Word } from '../../../src/search_query/parser/QueryParser';
import { Token } from '../../../src/search_query/parser/QueryTokenizer';

export default class TestQueryBuilder {
  private readonly query = new Query();

  withAndWords(...tokens: Token[]): TestQueryBuilder {
    const and = new And();

    for (const token of tokens) {
      const or = new Or();
      or.nodes.push(new Term(new Word(token), false));
      and.nodes.push(or);
    }

    this.query.nodes.push(and);
    return this;
  }

  withOrWords(...tokens: Token[]): TestQueryBuilder {
    const and = new And();

    const or = new Or();
    for (const token of tokens) {
      or.nodes.push(new Term(new Word(token), false));
    }
    and.nodes.push(or);

    this.query.nodes.push(and);
    return this;
  }

  build(): Query {
    return this.query;
  }
}
