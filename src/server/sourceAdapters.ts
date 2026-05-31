import type { SourceKind, SourcePost } from '../domain/types.js';
import { createMockSerenityPosts } from '../data/mockSerenityPosts.js';
import { fetchSerenityPostsFromX, hasXApiCredentials } from './xClient.js';

export interface SourceAdapter {
  readonly id: string;
  readonly kind: SourceKind;
  readonly label: string;
  isAvailable(): boolean;
  fetchLatest(): Promise<SourcePost[]>;
}

export class MockSourceAdapter implements SourceAdapter {
  readonly id = 'mock-serenity';
  readonly kind = 'mock';
  readonly label = 'Mock Serenity data';

  isAvailable(): boolean {
    return true;
  }

  async fetchLatest(): Promise<SourcePost[]> {
    return createMockSerenityPosts();
  }
}

export class XSourceAdapter implements SourceAdapter {
  readonly id = 'x-serenity';
  readonly kind = 'x';
  readonly label = 'Serenity on X';

  isAvailable(): boolean {
    return hasXApiCredentials();
  }

  async fetchLatest(): Promise<SourcePost[]> {
    return fetchSerenityPostsFromX();
  }
}

export function activeSourceAdapter(): SourceAdapter {
  const xAdapter = new XSourceAdapter();
  return xAdapter.isAvailable() ? xAdapter : new MockSourceAdapter();
}
