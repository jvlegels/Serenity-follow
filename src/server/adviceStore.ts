import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { SignalRecord, SourcePost } from '../domain/types.js';
import { analyzePosts, createWidgetState, defaultSettings, latestNoteworthySignal } from '../core/signalService.js';
import type { AdviceResponse } from '../domain/types.js';
import { serenityAccount } from '../data/mockSerenityPosts.js';

interface PersistedStore {
  posts: SourcePost[];
}

export class AdviceStore {
  private posts = new Map<string, SourcePost>();

  constructor(private readonly filePath = join(process.cwd(), '.data', 'signals.json')) {
    this.load();
  }

  ingest(posts: SourcePost[]): SignalRecord[] {
    for (const post of posts) {
      const normalizedPost = normalizePostLink(post);
      this.posts.set(normalizedPost.id, normalizedPost);
    }
    this.save();
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

  private load(): void {
    if (!existsSync(this.filePath)) {
      return;
    }

    try {
      const payload = JSON.parse(readFileSync(this.filePath, 'utf8')) as PersistedStore;
      for (const post of payload.posts ?? []) {
        const normalizedPost = normalizePostLink(post);
        this.posts.set(normalizedPost.id, normalizedPost);
      }
    } catch {
      this.posts.clear();
    }
  }

  private save(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const payload: PersistedStore = { posts: [...this.posts.values()] };
    writeFileSync(this.filePath, `${JSON.stringify(payload, null, 2)}\n`);
  }
}

function normalizePostLink(post: SourcePost): SourcePost {
  if (post.source === 'mock' || post.source === 'manual' || isSyntheticXStatus(post.url)) {
    return { ...post, url: serenityAccount.profileUrl };
  }

  return post;
}

function isSyntheticXStatus(url: string): boolean {
  return /https:\/\/x\.com\/aleabitoreddit\/status\/(mock|manual)_/.test(url);
}
