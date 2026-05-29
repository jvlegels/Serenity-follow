import { analyzePosts, createWidgetState, defaultSettings, latestNoteworthySignal } from '../core/signalService.js';
export class AdviceStore {
    posts = new Map();
    ingest(posts) {
        for (const post of posts) {
            this.posts.set(post.id, post);
        }
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
}
