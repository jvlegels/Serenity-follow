import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeTweet, buildGoogleFinanceUrl, extractAssets } from '../src/shared/adviceAnalyzer.js';

describe('adviceAnalyzer', () => {
  it('detects clear buying advice with a cashtag', () => {
    const advice = analyzeTweet({
      id: '1',
      text: 'Buying $COIN here, clean breakout.',
      createdAt: '2026-05-29T10:00:00.000Z'
    });

    assert.equal(advice.signal, 'buy');
    assert.deepEqual(advice.assets, [
      {
        symbol: 'COIN',
        label: '$COIN',
        googleFinanceUrl: 'https://www.google.com/finance/search?q=COIN'
      }
    ]);
  });

  it('downgrades conditional entries to watch', () => {
    const advice = analyzeTweet({
      id: '2',
      text: 'Watching $MSTR if it breaks resistance. No entry yet.',
      createdAt: '2026-05-29T10:05:00.000Z'
    });

    assert.equal(advice.signal, 'watch');
  });

  it('ignores general market commentary', () => {
    const advice = analyzeTweet({
      id: '3',
      text: 'Patience today. Market is still choppy.',
      createdAt: '2026-05-29T10:10:00.000Z'
    });

    assert.equal(advice.signal, 'ignore');
  });


  it('marks conditional add language as watch', () => {
    const advice = analyzeTweet({
      id: '4',
      text: 'If $NVDA reclaims yesterday high I may add, but not chasing this candle.',
      createdAt: '2026-05-29T10:15:00.000Z'
    });

    assert.equal(advice.signal, 'watch');
    assert.equal(advice.assets[0].symbol, 'NVDA');
  });

  it('builds Google Finance search links', () => {
    assert.equal(buildGoogleFinanceUrl('$tsla'), 'https://www.google.com/finance/search?q=TSLA');
  });

  it('extracts unique assets from cashtags and uppercase symbols', () => {
    assert.deepEqual(extractAssets('Added $NVDA and watching COIN').map((asset) => asset.symbol), ['NVDA', 'COIN']);
  });
});
