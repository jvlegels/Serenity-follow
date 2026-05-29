import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { analyzePosts, createWidgetState, defaultSettings, latestNoteworthySignal } from '../core/signalService.js';
import { serenityAccount } from '../data/mockSerenityPosts.js';
export class AdviceStore {
    filePath;
    posts = new Map();
    constructor(filePath = join(process.cwd(), '.data', 'signals.json')) {
        this.filePath = filePath;
        this.load();
    }
    ingest(posts) {
        for (const post of posts) {
            const normalizedPost = normalizePostLink(post);
            this.posts.set(normalizedPost.id, normalizedPost);
        }
        this.save();
        return this.records();
    }
    records() {
        return analyzePosts([...this.posts.values()]);
    }
    response(mode, message) {
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
    load() {
        if (!existsSync(this.filePath)) {
            return;
        }
        try {
            const payload = JSON.parse(readFileSync(this.filePath, 'utf8'));
            for (const post of payload.posts ?? []) {
                const normalizedPost = normalizePostLink(post);
                this.posts.set(normalizedPost.id, normalizedPost);
            }
        }
        catch {
            this.posts.clear();
        }
    }
    save() {
        mkdirSync(dirname(this.filePath), { recursive: true });
        const payload = { posts: [...this.posts.values()] };
        writeFileSync(this.filePath, `${JSON.stringify(payload, null, 2)}\n`);
    }
}
function normalizePostLink(post) {
    if (post.source === 'mock' || post.source === 'manual' || isSyntheticXStatus(post.url)) {
        return { ...post, url: serenityAccount.profileUrl };
    }
    return post;
}
function isSyntheticXStatus(url) {
    return /https:\/\/x\.com\/aleabitoreddit\/status\/(mock|manual)_/.test(url);
}
