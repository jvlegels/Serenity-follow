import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MockSourceAdapter } from '../dist/server/sourceAdapters.js';

describe('source adapters', () => {
  it('mock adapter returns Serenity-style posts without credentials', async () => {
    const adapter = new MockSourceAdapter();
    const posts = await adapter.fetchLatest();
    assert.equal(adapter.isAvailable(), true);
    assert.ok(posts.length >= 1);
    assert.equal(posts[0].authorHandle, 'aleabitoreddit');
  });
});
