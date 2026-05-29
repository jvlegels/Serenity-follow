import { analyzeTweet } from '../shared/adviceAnalyzer.js';

export class AdviceStore {
  #items = new Map();

  ingest(posts) {
    const analyzed = posts.map(analyzeTweet);
    for (const item of analyzed) {
      this.#items.set(item.id, item);
    }
    return analyzed;
  }

  latest() {
    return [...this.#items.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  latestBuy() {
    return this.latest().find((item) => item.signal === 'buy');
  }
}
