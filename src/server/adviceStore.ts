import type { SignalRecord, SourcePost } from '../domain/types.js';
import { analyzePosts, createWidgetState, defaultSettings, latestNoteworthySignal } from '../core/signalService.js';
import type { AdviceResponse } from '../domain/types.js';

export class AdviceStore {
  private posts = new Map<string, SourcePost>();

  ingest(posts: SourcePost[]): SignalRecord[] {
    for (const post of posts) {
      this.posts.set(post.id, post);
    }
    return this.records();
  }

  records(): SignalRecord[] {
    return analyzePosts([...this.posts.values()]);
  }

  response(mode: 'mock' | 'live' | 'error', message: string): AdviceResponse {
    const records = this.records();
    return {
      records,
      latestSignal: latestNoteworthySignal(records),
      widget: createWidgetState(records),
      settings: defaultSettings,
      sourceStatus: {
        mode,
        message,
        checkedAt: new Date().toISOString()
      }
    };
  }
}
