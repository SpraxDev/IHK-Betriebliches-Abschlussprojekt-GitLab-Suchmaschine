export default class Paginated<T> {
  private readonly items: T[];
  private readonly fetchNextPage?: () => Promise<Paginated<T>>;

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
    return this.fetchNextPage != null;
  }
}
