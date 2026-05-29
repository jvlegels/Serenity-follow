import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildGoogleFinanceUrl } from '../dist/core/assetCatalog.js';
import { createMockSerenityPosts, serenityAccount } from '../dist/data/mockSerenityPosts.js';
import { AdviceStore } from '../dist/server/adviceStore.js';

describe('external link targets', () => {
  it('uses direct Google Finance quote URLs for known listed assets', () => {
    assert.equal(buildGoogleFinanceUrl('COIN'), 'https://www.google.com/finance/quote/COIN%3ANASDAQ');
    assert.equal(buildGoogleFinanceUrl('$TSLA'), 'https://www.google.com/finance/quote/TSLA%3ANASDAQ');
  });

  it('uses direct Google Finance quote URLs for known crypto assets', () => {
    assert.equal(buildGoogleFinanceUrl('BTC'), 'https://www.google.com/finance/quote/BTC-USD');
  });

  it('does not generate fake X status URLs for mock posts', () => {
    const posts = createMockSerenityPosts(new Date('2026-05-29T10:00:00.000Z'));
    assert.ok(posts.every((post) => post.url === serenityAccount.profileUrl));
  });

  it('normalizes previously persisted synthetic mock/manual X URLs', () => {
    const store = new AdviceStore('/tmp/serenity-follow-link-test.json');
    store.ingest([
      {
        id: 'mock_legacy',
        accountId: 'acct_serenity_x',
        source: 'mock',
        authorHandle: 'aleabitoreddit',
        text: 'Added $COIN here.',
        url: 'https://x.com/aleabitoreddit/status/mock_legacy',
        postedAt: '2026-05-29T10:00:00.000Z'
      }
    ]);
    assert.equal(store.records()[0].post.url, serenityAccount.profileUrl);
  });
});
