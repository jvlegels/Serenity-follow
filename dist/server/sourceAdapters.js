import { createMockSerenityPosts } from '../data/mockSerenityPosts.js';
import { fetchSerenityPostsFromX, hasXApiCredentials } from './xClient.js';
export class MockSourceAdapter {
    id = 'mock-serenity';
    kind = 'mock';
    label = 'Mock Serenity data';
    isAvailable() {
        return true;
    }
    async fetchLatest() {
        return createMockSerenityPosts();
    }
}
export class XSourceAdapter {
    id = 'x-serenity';
    kind = 'x';
    label = 'Serenity on X';
    isAvailable() {
        return hasXApiCredentials();
    }
    async fetchLatest() {
        return fetchSerenityPostsFromX();
    }
}
export function activeSourceAdapter() {
    const xAdapter = new XSourceAdapter();
    return xAdapter.isAvailable() ? xAdapter : new MockSourceAdapter();
}
