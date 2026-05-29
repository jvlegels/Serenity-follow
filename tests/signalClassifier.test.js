import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyPost } from '../dist/core/signalClassifier.js';
import { analyzePosts, createWidgetState } from '../dist/core/signalService.js';

function post(id, text) {
  return {
    id,
    accountId: 'acct_serenity_x',
    source: 'mock',
    authorHandle: 'aleabitoreddit',
    text,
    url: `https://x.com/aleabitoreddit/status/${id}`,
    postedAt: '2026-05-29T10:00:00.000Z'
  };
}

describe('signal classifier', () => {
  it('classifies direct added language as a high-confidence potential signal', () => {
    const analysis = classifyPost(post('1', 'Added a starter position in $COIN here.'));
    assert.equal(analysis.level, 'high');
    assert.equal(analysis.asset?.ticker, 'COIN');
    assert.ok(analysis.confidence >= 0.68);
  });

  it('classifies conditional add language as possible, not high confidence', () => {
    const analysis = classifyPost(post('2', 'If $NVDA reclaims yesterday high I may add, but not chasing this candle.'));
    assert.equal(analysis.level, 'possible');
    assert.equal(analysis.asset?.ticker, 'NVDA');
  });

  it('classifies profit-taking as no signal', () => {
    const analysis = classifyPost(post('3', 'Taking profit on part of $HOOD. Great move, but this is not a fresh buy for me.'));
    assert.equal(analysis.level, 'none');
  });


  it('classifies watching/no-entry language as possible without treating entry as positive', () => {
    const analysis = classifyPost(post('4', 'Watching $MSTR if it breaks the range. No entry yet.'));
    assert.equal(analysis.level, 'possible');
    assert.equal(analysis.asset?.ticker, 'MSTR');
    assert.ok(analysis.confidence < 0.45);
  });

  it('creates a green widget state for the latest high-confidence signal', () => {
    const records = analyzePosts([post('1', 'Added a starter position in $COIN here.')]);
    const widget = createWidgetState(records, new Date('2026-05-29T10:05:00.000Z'));
    assert.equal(widget.color, 'green');
    assert.match(widget.summary, /COIN/);
  });
});
